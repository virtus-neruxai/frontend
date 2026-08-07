import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import TaskDraftModal from '../components/TaskDraftModal';
import ReasonedReportView from '../presentation/components/reasoning/ReasonedReportView';
import TransformativeCompanionCard from '../presentation/components/reasoning/TransformativeCompanionCard';
import { useProfileTheme } from '../theme/useProfileTheme';
import { reasoningApi, tasksApi } from '../lib/api';
import { Brain, History, Loader2, Send } from 'lucide-react';

const REPORT_RANGE_OPTIONS = [
  { value: 1, label: 'Diario' },
  { value: 7, label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
];
const REPORT_JOB_STORAGE_KEY = 'virtus.reasoning.active-report-job';

function readPendingReportJobId() {
  try {
    return window.sessionStorage.getItem(REPORT_JOB_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistPendingReportJobId(jobId) {
  try {
    window.sessionStorage.setItem(REPORT_JOB_STORAGE_KEY, jobId);
  } catch {
    // The report keeps running server-side even if browser storage is blocked.
  }
}

function clearPendingReportJobId() {
  try {
    window.sessionStorage.removeItem(REPORT_JOB_STORAGE_KEY);
  } catch {
    // Nothing else is needed: this only controls the local progress indicator.
  }
}

function reportRangeLabel(daysBack) {
  const numeric = Number(daysBack) || 14;
  return REPORT_RANGE_OPTIONS.find((option) => option.value === numeric)?.label || `Últimos ${numeric} días`;
}

// A recommendation has no schedule; prefill a sensible default the user can edit.
function defaultDraftFromRecommendation(rec) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 30 * 60000);
  const st = rec?.suggested_task || {};
  return {
    data: {
      title: (st.title || rec?.title || '').slice(0, 60),
      description: st.description || rec?.rationale || '',
      domain: st.domain || 'Personal',
      task_kind: 'task',
      difficulty: 2,
      estimated_duration_minutes: 30,
      date_start: start.toISOString(),
      date_end: end.toISOString(),
    },
    metadata: rec?.rationale ? { agent_reasoning: rec.rationale } : {},
  };
}

export default function ReasoningReportPage() {
  const { theme } = useProfileTheme();
  const profileName = theme?.name || '';

  const [report, setReport] = useState(null); // {report_id, report_json, ...}
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [reportJobId, setReportJobId] = useState(readPendingReportJobId);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedDaysBack, setSelectedDaysBack] = useState(14);

  // Chat about the current report
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]); // [{role, content}]
  const [asking, setAsking] = useState(false);
  const sessionRef = useRef(null);

  const reportJson = report?.report_json || null;
  const reportId = report?.report_id || null;
  // V3 (NRRM) extends V2 rather than replacing it: same causal contract plus
  // data_quality, positive_evidence and learned_response_candidates. One view
  // renders both, because the V3-only blocks hide themselves when absent.
  //
  // V1 is no longer rendered at all. It was a different contract, not an older
  // one — not a single field name in common — so it needed its own renderer,
  // and nothing has generated it for a long time. Documents saved before
  // schema_version existed simply show nothing.
  const schemaVersion = report?.schema_version || reportJson?.schema_version || '1';
  const filteredHistory = history.filter((item) => Number(item.days_back || 14) === selectedDaysBack);
  const generating = startingGeneration || Boolean(reportJobId);

  // ── NRRM: companion + feedback ────────────────────────────────────────────
  const [companion, setCompanion] = useState(null);
  const [companionLoading, setCompanionLoading] = useState(false);
  // The endpoints 404 while the feature flags are off. That is the intended
  // "not available" signal, so the whole surface hides instead of showing an
  // error for something the user never asked for.
  const [companionAvailable, setCompanionAvailable] = useState(true);
  const [adopting, setAdopting] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [feedback, setFeedback] = useState([]);

  const loadCompanionAndFeedback = useCallback(async (id) => {
    if (!id) return;
    setCompanion(null);
    setAdopted(false);
    setFeedback([]);
    try {
      const { data } = await reasoningApi.getCompanion(id);
      setCompanion(data?.companion || null);
    } catch (e) {
      // 404 here means either "not generated yet" or "flag off"; both are
      // simply "nothing to show", never an error worth a toast.
      setCompanion(null);
    }
    try {
      const { data } = await reasoningApi.getFeedback(id);
      setFeedback(data?.items || []);
      setCompanionAvailable(true);
    } catch (e) {
      if (e?.response?.status === 404) setCompanionAvailable(false);
    }
  }, []);

  // A judgement is stored under a hashed key, so the UI matches it back by the
  // wording it was given on (content targets) or by report+stage (companion).
  const feedbackFor = useCallback(
    (key) => feedback.find(
      (item) => item.target_text === key || item.target_key === `${reportId}:${key}`,
    ),
    [feedback, reportId],
  );

  const submitFeedback = useCallback(async (payload) => {
    if (!reportId) return;
    try {
      const { data } = await reasoningApi.sendFeedback(reportId, payload);
      setFeedback((items) => [
        ...items.filter((item) => item.target_key !== data.target_key),
        data,
      ]);
      toast.success(payload.verdict ? 'Gracias, lo tendré en cuenta' : 'Feedback deshecho');
    } catch {
      toast.error('No se pudo guardar tu respuesta');
    }
  }, [reportId]);

  const submitResourceFeedback = useCallback(async (resourceId, value) => {
    if (!reportId) return;
    try {
      await reasoningApi.sendResourceFeedback(reportId, resourceId, value);
      toast.success(value ? 'Anotado' : 'Feedback deshecho');
    } catch {
      toast.error('No se pudo guardar tu respuesta');
    }
  }, [reportId]);

  const generateCompanion = useCallback(async () => {
    if (!reportId) return;
    setCompanionLoading(true);
    try {
      const { data } = await reasoningApi.generateCompanion(reportId);
      setCompanion(data?.companion || null);
      setAdopted(false);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        setCompanionAvailable(false);
      } else if (status === 409) {
        toast.info(e.response?.data?.detail || 'No se puede generar el mensaje para este informe.');
      } else {
        toast.error('No se pudo generar el mensaje. Vuelve a intentarlo.');
      }
    } finally {
      setCompanionLoading(false);
    }
  }, [reportId]);

  const adopt = useCallback(async () => {
    if (!reportId) return;
    setAdopting(true);
    try {
      await reasoningApi.adoptAlternativeResponse(reportId);
      setAdopted(true);
      toast.success('Respuesta adoptada. La verás en tus conductas.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo adoptar la respuesta.');
    } finally {
      setAdopting(false);
    }
  }, [reportId]);

  const generate = useCallback(async () => {
    setStartingGeneration(true);
    try {
      const { data } = await reasoningApi.generateReport(selectedDaysBack);
      setReportJobId(data.job_id);
      persistPendingReportJobId(data.job_id);
      toast.info('El informe se está generando en segundo plano. Puedes salir de esta pantalla.');
    } catch (e) {
      toast.error('No se pudo generar el informe. Vuelve a intentarlo.');
    } finally {
      setStartingGeneration(false);
    }
  }, [selectedDaysBack]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await reasoningApi.getReports();
      setHistory(data?.reports || []);
    } catch {
      toast.error('No se pudo cargar el historial');
    }
  }, []);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  const openReport = useCallback(async (id) => {
    try {
      const { data } = await reasoningApi.getReport(id);
      setReport({
        report_id: data.id,
        prompt_profile: data.prompt_profile,
        period_start: data.period_start,
        period_end: data.period_end,
        days_back: data.days_back || 14,
        created_at: data.created_at,
        report_json: data.report_json,
        report_markdown: data.report_markdown,
        schema_version: data.schema_version,
      });
      setSelectedDaysBack(Number(data.days_back || 14));
      setThread([]);
      sessionRef.current = null;
      setShowHistory(false);
      loadCompanionAndFeedback(data.id);
      return true;
    } catch {
      toast.error('No se pudo abrir el informe');
      return false;
    }
  }, [loadCompanionAndFeedback]);

  useEffect(() => {
    if (!reportJobId) return undefined;

    let disposed = false;
    const finish = () => {
      clearPendingReportJobId();
      if (!disposed) setReportJobId(null);
    };
    const poll = async () => {
      try {
        const { data } = await reasoningApi.getReportJob(reportJobId);
        if (disposed || data.status === 'queued' || data.status === 'running') return;

        finish();
        if (data.status === 'failed') {
          toast.error(data.error || 'No se pudo generar el informe. Vuelve a intentarlo.');
          return;
        }
        if (data.mode === 'SAFE_NO_ACTION') {
          setReport({
            report_id: null,
            mode: data.mode,
            days_back: data.days_back,
            report_json: {},
            report_markdown: data.safe_message || '',
          });
          setSelectedDaysBack(Number(data.days_back || 14));
          setThread([]);
          sessionRef.current = null;
          toast.info('Ahora mismo priorizamos tu bienestar antes que el informe.');
          return;
        }
        if (data.report_id && await openReport(data.report_id)) {
          toast.success('Informe generado');
        }
      } catch (error) {
        if (error?.response?.status === 404) {
          finish();
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 2500);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [openReport, reportJobId]);

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setThread((t) => [...t, { role: 'user', content: q }]);
    setAsking(true);
    try {
      const { data } = await reasoningApi.chat(q, sessionRef.current, reportId, 'ask_about_report');
      sessionRef.current = data.session_id;
      setThread((t) => [...t, { role: 'assistant', content: data.response }]);
    } catch {
      setThread((t) => [...t, { role: 'assistant', content: 'No he podido responder ahora mismo.' }]);
    } finally {
      setAsking(false);
    }
  }, [question, reportId]);

  // Task draft modal (review before creating), reused from the Mentor.
  const [draftData, setDraftData] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const convertToTask = useCallback((rec) => {
    setDraftData(defaultDraftFromRecommendation(rec));
    setShowDraftModal(true);
  }, []);

  const confirmDraft = useCallback(async (payload) => {
    try {
      await tasksApi.create(payload);
      toast.success('Tarea creada');
    } catch {
      toast.error('No se pudo crear la tarea');
    }
  }, []);

  return (
    <Layout ambient>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Brain className="h-6 w-6" /> Informe Razonado
            </h1>
            <div className="text-muted-foreground">
              Tu lectura: {reportRangeLabel(selectedDaysBack)}
              {profileName ? <> · <Badge variant="secondary">{profileName}</Badge></> : null}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Select value={String(selectedDaysBack)} onValueChange={(value) => setSelectedDaysBack(Number(value))}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Generar informe
            </Button>
            <Button variant="outline" onClick={() => setShowHistory((s) => !s)}>
              <History className="mr-2 h-4 w-4" /> Historial
            </Button>
          </div>
        </div>

        {showHistory && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Historial de informes</CardTitle>
                <Select value={String(selectedDaysBack)} onValueChange={(value) => setSelectedDaysBack(Number(value))}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay informes generados.</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay informes para {reportRangeLabel(selectedDaysBack).toLowerCase()}.
                </p>
              ) : (
                filteredHistory.map((r) => (
                  <button
                    key={r.report_id}
                    onClick={() => openReport(r.report_id)}
                    className="block w-full rounded-md border p-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="text-muted-foreground">{(r.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                    {r.prompt_profile ? <Badge variant="outline" className="ml-2">{r.prompt_profile}</Badge> : null}
                    <Badge variant="secondary" className="ml-2">{reportRangeLabel(r.days_back || 14)}</Badge>
                    {r.summary ? <span> — {r.summary.slice(0, 90)}</span> : null}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {generating && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              El informe se está generando en segundo plano. Puedes navegar con normalidad; aparecerá en el historial al terminar.
            </CardContent>
          </Card>
        )}

        {report?.report_markdown && report?.mode === 'SAFE_NO_ACTION' && (
          <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{report.report_markdown}</CardContent></Card>
        )}

        {reportJson && (
          <ReasonedReportView
            report={reportJson}
            onConvertToTask={convertToTask}
            feedbackFor={companionAvailable ? feedbackFor : undefined}
            onFeedback={companionAvailable ? submitFeedback : undefined}
            onResourceFeedback={companionAvailable ? submitResourceFeedback : undefined}
          />
        )}

        {/* "Un mensaje para ti": misma pantalla que el informe (§13.1), pero
            visualmente distinto — el usuario debe saber siempre si lee análisis
            o acompañamiento. */}
        {reportJson && schemaVersion === '3' && companionAvailable && (
          <TransformativeCompanionCard
            companion={companion}
            loading={companionLoading}
            onGenerate={generateCompanion}
            onAdopt={adopt}
            adopting={adopting}
            adopted={adopted}
            feedbackFor={feedbackFor}
            onFeedback={submitFeedback}
          />
        )}

        {reportJson && (
          <Card>
            <CardHeader><CardTitle className="text-base">Preguntar sobre este informe</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {thread.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>{m.content}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                  placeholder="¿Qué patrón ves? ¿Por dónde empiezo?"
                  rows={2}
                />
                <Button onClick={ask} disabled={asking || !question.trim()}>
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!reportJson && !generating && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">
            Pulsa <strong>Generar informe</strong> para tu lectura razonada: {reportRangeLabel(selectedDaysBack).toLowerCase()}.
          </CardContent></Card>
        )}
      </div>

      <TaskDraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        draftData={draftData}
        onConfirm={confirmDraft}
        onReject={() => setShowDraftModal(false)}
      />
    </Layout>
  );
}
