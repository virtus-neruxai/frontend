import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { profileApi } from '../lib/api';
import { getProfileName, getProfileEmoji } from '../lib/profileUtils';
import { useProfileTheme } from '../theme/useProfileTheme';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';

const QUESTION_TYPE_LABELS = {
  text: 'Texto',
  likert_1_7: 'Likert 1–7',
  ranking: 'Ranking',
  multi_select: 'Selección múltiple',
  single_select: 'Selección única'
};

const buildLikertOptions = () => [1, 2, 3, 4, 5, 6, 7];

export default function QuestionnairePage() {
  const { profileId: activeProfile } = useProfileTheme();
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileName = getProfileName(activeProfile);
  const profileEmoji = getProfileEmoji(activeProfile);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [templateRes, profileRes] = await Promise.all([
          profileApi.getTemplate(),
          profileApi.getProfile().catch(() => null)
        ]);
        setTemplate(templateRes.data);
        if (profileRes?.data?.raw_answers) {
          setAnswers(profileRes.data.raw_answers);
        }
      } catch {
        toast.error('No se pudo cargar el cuestionario');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Tab 1: sections without profile_tag (legacy mission sections)
  const missionSections = useMemo(() => {
    if (!template?.sections) return [];
    return template.sections.filter((s) => !s.profile_tag);
  }, [template]);

  // Tab 2: common context section + user's active profile section
  const contextSections = useMemo(() => {
    if (!template?.sections) return [];
    return template.sections.filter(
      (s) => s.profile_tag === 'common' || s.profile_tag === activeProfile
    );
  }, [template, activeProfile]);

  const flattenedQuestions = useMemo(() => {
    return [...missionSections, ...contextSections].flatMap((s) => s.questions || []);
  }, [missionSections, contextSections]);

  const updateAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: null }));
  };

  const toggleMultiSelect = (question, option) => {
    const currentValue = Array.isArray(answers[question.id]) ? answers[question.id] : [];
    if (!currentValue.includes(option) && question.max_choices && currentValue.length >= question.max_choices) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [question.id]: `Selecciona como máximo ${question.max_choices} opciones.`
      }));
      return;
    }
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id]) ? prev[question.id] : [];
      if (current.includes(option)) {
        return { ...prev, [question.id]: current.filter((item) => item !== option) };
      }
      return { ...prev, [question.id]: [...current, option] };
    });
    setErrors((prevErrors) => ({ ...prevErrors, [question.id]: null }));
  };

  const updateRanking = (questionId, item, rankValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [item]: rankValue }
    }));
    setErrors((prev) => ({ ...prev, [questionId]: null }));
  };

  const getRankingCount = (question) =>
    question.validation?.ranking_count || question.ranking_items?.length || 0;

  const validateQuestion = (question, value) => {
    const validation = question.validation || {};
    const isEmpty =
      value == null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);

    if (isEmpty) {
      return validation.required ? 'Esta pregunta es obligatoria.' : null;
    }

    if (question.answer_type === 'likert_1_7') {
      return Number.isInteger(value) && value >= 1 && value <= 7
        ? null
        : 'Debe ser un entero entre 1 y 7.';
    }

    if (question.answer_type === 'single_select') {
      return question.options?.includes(value) ? null : 'La opción seleccionada no es válida.';
    }

    if (question.answer_type === 'multi_select') {
      if (!Array.isArray(value)) return 'Debe ser una lista de opciones.';
      if (value.some((item) => !question.options?.includes(item))) return 'Contiene opciones no válidas.';
      if (question.max_choices && value.length > question.max_choices) {
        return `Selecciona como máximo ${question.max_choices} opciones.`;
      }
      return null;
    }

    if (question.answer_type === 'ranking') {
      const rankingCount = getRankingCount(question);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return `Ordena exactamente ${rankingCount} elementos.`;
      }
      const ranks = Object.values(value).filter((rank) => rank !== '' && rank != null);
      if (ranks.length !== rankingCount) return `Ordena exactamente ${rankingCount} elementos.`;
      if (ranks.some((rank) => !Number.isInteger(rank))) return 'Las posiciones deben ser enteros.';
      const expected = Array.from({ length: rankingCount }, (_, idx) => idx + 1);
      const uniqueRanks = new Set(ranks);
      const hasExpectedRanks = expected.every((rank) => uniqueRanks.has(rank));
      return uniqueRanks.size === ranks.length && hasExpectedRanks
        ? null
        : `Usa posiciones únicas 1..${rankingCount}, sin empates ni huecos.`;
    }

    return null;
  };

  const validateAnswers = () => {
    const nextErrors = {};
    flattenedQuestions.forEach((question) => {
      const message = validateQuestion(question, answers[question.id]);
      if (message) nextErrors[question.id] = message;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!template) return;
    if (!validateAnswers()) {
      toast.error('Revisa las respuestas marcadas');
      return;
    }
    setSaving(true);
    try {
      await profileApi.saveProfile({
        template_id: template.template_id,
        version: template.version,
        answers
      });
      toast.success('Perfil actualizado');
    } catch {
      toast.error('No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionInput = (question) => {
    const value = answers[question.id];

    switch (question.answer_type) {
      case 'text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Escribe tu respuesta..."
          />
        );
      case 'likert_1_7':
        return (
          <div className="space-y-2">
            <RadioGroup
              value={value?.toString() || ''}
              onValueChange={(val) => updateAnswer(question.id, Number(val))}
              className="grid grid-cols-7 gap-2"
            >
              {buildLikertOptions().map((option) => (
                <div key={option} className="flex flex-col items-center gap-2">
                  <RadioGroupItem value={option.toString()} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`} className="text-xs text-muted-foreground">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {question.anchors && (
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>1 · {question.anchors['1']}</span>
                <span className="text-center">4 · {question.anchors['4']}</span>
                <span className="text-right">7 · {question.anchors['7']}</span>
              </div>
            )}
          </div>
        );
      case 'ranking':
        return (
          <div className="space-y-3">
            {question.ranking_items?.map((item) => (
              <div key={item} className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">{item}</Label>
                <Select
                  value={value?.[item]?.toString() || ''}
                  onValueChange={(val) => updateRanking(question.id, item, Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona orden" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: getRankingCount(question) }, (_, idx) => (
                      <SelectItem key={`${item}-${idx + 1}`} value={(idx + 1).toString()}>
                        {idx + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        );
      case 'multi_select':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  disabled={
                    Array.isArray(value) &&
                    !value.includes(option) &&
                    question.max_choices &&
                    value.length >= question.max_choices
                  }
                  onCheckedChange={() => toggleMultiSelect(question, option)}
                />
                {option}
              </label>
            ))}
          </div>
        );
      case 'single_select':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={(val) => updateAnswer(question.id, val)}
            className="grid gap-2"
          >
            {question.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-foreground">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </label>
            ))}
          </RadioGroup>
        );
      default:
        return null;
    }
  };

  const renderSections = (sections) =>
    sections.map((section) => (
      <Card key={section.id}>
        <CardHeader>
          <CardTitle className="text-lg text-foreground">{section.title}</CardTitle>
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {section.questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{question.prompt}</p>
                {question.microcopy && (
                  <p className="text-xs text-muted-foreground">{question.microcopy}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1">
                    {QUESTION_TYPE_LABELS[question.answer_type] || question.answer_type}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    Objetivo: {question.objective}
                  </span>
                  {question.validation?.hint && (
                    <span className="rounded-full bg-muted px-2 py-1">
                      Formato: {question.validation.hint}
                    </span>
                  )}
                </div>
              </div>
              {renderQuestionInput(question)}
              {errors[question.id] && (
                <p className="text-xs font-medium text-destructive">{errors[question.id]}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    ));

  if (loading) {
    return (
      <Layout ambient>
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          Cargando cuestionario...
        </div>
      </Layout>
    );
  }

  return (
    <Layout ambient>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">Enunciado de misión</h1>
          <p className="text-sm text-muted-foreground">
            Responde para perfilar valores, fricciones y activar recomendaciones del agente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="mission">
            <TabsList className="mb-4 bg-muted p-1 rounded-full">
              <TabsTrigger value="mission" className="rounded-full data-[state=active]:bg-card">
                Misión
              </TabsTrigger>
              <TabsTrigger value="context" className="rounded-full data-[state=active]:bg-card">
                {profileEmoji} Contexto · {profileName}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="space-y-6">
              {renderSections(missionSections)}
            </TabsContent>

            <TabsContent value="context" className="space-y-6">
              {contextSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay preguntas de contexto para este perfil todavía.</p>
              ) : (
                renderSections(contextSections)
              )}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Total preguntas: {flattenedQuestions.length}
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
