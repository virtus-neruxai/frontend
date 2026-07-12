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
import { useProfileTheme } from '../theme/useProfileTheme';
import { reasoningApi, tasksApi } from '../lib/api';
import { Brain, History, Loader2, PlusCircle, Send } from 'lucide-react';

const REPORT_RANGE_OPTIONS = [
  { value: 1, label: 'Diario' },
  { value: 7, label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
];

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

function Section({ title, items, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <span className={`font-medium ${tone || ''}`}>{it.point}</span>
            {it.evidence ? <span className="text-muted-foreground"> — {it.evidence}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReasoningReportPage() {
  const { theme } = useProfileTheme();
  const profileName = theme?.name || '';

  const [report, setReport] = useState(null); // {report_id, report_json, ...}
  const [generating, setGenerating] = useState(false);
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
  // Prospective only: documents saved before schema_version existed have no
  // such field anywhere (report, reportJson) — those are implicitly V1.
  const schemaVersion = report?.schema_version || reportJson?.schema_version || '1';
  const isV2 = schemaVersion === '2';
  const filteredHistory = history.filter((item) => Number(item.days_back || 14) === selectedDaysBack);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const { data } = await reasoningApi.generateReport(selectedDaysBack);
      setReport(data);
      setThread([]);
      sessionRef.current = null;
      if (data?.mode === 'SAFE_NO_ACTION') {
        toast.info('Ahora mismo priorizamos tu bienestar antes que el informe.');
      } else {
        toast.success('Informe generado');
      }
    } catch (e) {
      toast.error('No se pudo generar el informe');
    } finally {
      setGenerating(false);
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
    } catch {
      toast.error('No se pudo abrir el informe');
    }
  }, []);

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

        {report?.report_markdown && report?.mode === 'SAFE_NO_ACTION' && (
          <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{report.report_markdown}</CardContent></Card>
        )}

        {reportJson && isV2 && (
          <ReasonedReportView report={reportJson} onConvertToTask={convertToTask} />
        )}

        {reportJson && !isV2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Tu informe</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {reportJson.summary && <p className="text-sm">{reportJson.summary}</p>}
              <Section title="✅ Lo que has hecho bien" items={reportJson.bien_hecho} tone="text-[hsl(var(--success))]" />
              <Section title="➖ Neutral" items={reportJson.neutral} />
              <Section title="🔧 A mejorar" items={reportJson.mejora} tone="text-[hsl(var(--warning))]" />

              {reportJson.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Recomendaciones</h3>
                  {reportJson.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-md border p-2">
                      <div className="text-sm">
                        <p className="font-medium">{rec.title}</p>
                        {rec.rationale && <p className="text-muted-foreground">{rec.rationale}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => convertToTask(rec)}>
                        <PlusCircle className="mr-1 h-4 w-4" /> Convertir en tarea
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
