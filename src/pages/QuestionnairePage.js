import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { profileApi } from '../lib/api';
import { getProfileName, getProfileEmoji } from '../lib/profileUtils';
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
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeProfile = localStorage.getItem('prompt_profile') || 'stoic';
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
  };

  const toggleMultiSelect = (questionId, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter((item) => item !== option) };
      }
      return { ...prev, [questionId]: [...current, option] };
    });
  };

  const updateRanking = (questionId, item, rankValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [item]: rankValue }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!template) return;
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
            className="bg-white text-black placeholder:text-gray-500 dark:bg-white dark:text-black"
          />
        );
      case 'likert_1_7':
        return (
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
        );
      case 'ranking':
        return (
          <div className="space-y-3">
            {question.ranking_items?.map((item) => (
              <div key={item} className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-[#18181B] dark:text-white">{item}</Label>
                <Select
                  value={value?.[item]?.toString() || ''}
                  onValueChange={(val) => updateRanking(question.id, item, Number(val))}
                >
                  <SelectTrigger className="w-full bg-white text-black dark:bg-white dark:text-black">
                    <SelectValue placeholder="Selecciona orden" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.ranking_items.map((_, idx) => (
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
              <label key={option} className="flex items-center gap-2 text-sm text-[#18181B] dark:text-white">
                <Checkbox
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onCheckedChange={() => toggleMultiSelect(question.id, option)}
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
              <label key={option} className="flex items-center gap-2 text-sm text-[#18181B] dark:text-white">
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
      <Card key={section.id} className="border border-[#E4E4E7]">
        <CardHeader>
          <CardTitle className="text-lg text-[#18181B] dark:text-white">{section.title}</CardTitle>
          {section.description && (
            <p className="text-sm text-[#71717A]">{section.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {section.questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#18181B] dark:text-white">{question.prompt}</p>
                <div className="flex flex-wrap gap-2 text-xs text-[#71717A]">
                  <span className="rounded-full bg-[#F4F4F5] px-2 py-1">
                    {QUESTION_TYPE_LABELS[question.answer_type] || question.answer_type}
                  </span>
                  <span className="rounded-full bg-[#F4F4F5] px-2 py-1">
                    Objetivo: {question.objective}
                  </span>
                </div>
              </div>
              {renderQuestionInput(question)}
            </div>
          ))}
        </CardContent>
      </Card>
    ));

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          Cargando cuestionario...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#18181B] dark:text-white">Enunciado de misión</h1>
          <p className="text-sm text-[#71717A]">
            Responde para perfilar valores, fricciones y activar recomendaciones del agente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="mission">
            <TabsList className="mb-4 bg-[#F4F4F5] p-1 rounded-full">
              <TabsTrigger value="mission" className="rounded-full data-[state=active]:bg-white">
                Misión
              </TabsTrigger>
              <TabsTrigger value="context" className="rounded-full data-[state=active]:bg-white">
                {profileEmoji} Contexto · {profileName}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="space-y-6">
              {renderSections(missionSections)}
            </TabsContent>

            <TabsContent value="context" className="space-y-6">
              {contextSections.length === 0 ? (
                <p className="text-sm text-[#71717A]">No hay preguntas de contexto para este perfil todavía.</p>
              ) : (
                renderSections(contextSections)
              )}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#71717A]">
              Total preguntas: {flattenedQuestions.length}
            </p>
            <Button type="submit" disabled={saving} className="bg-[#F97316] hover:bg-[#FB923C]">
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
