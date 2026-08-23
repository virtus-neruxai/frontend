import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Sun, CalendarDays, CalendarRange, CheckCircle2, Flame, Trash2, Sparkles, Flag } from 'lucide-react';
import { useChallenges } from '../../viewmodels/useChallenges';
import ChallengeDraftModal from '../../../components/ChallengeDraftModal';
import { FinishedList } from './FinishedList';
import { StatRewardsChips } from '../stats/StatRewardsChips';
import { ChallengeRoutineReflections } from './ChallengeRoutineReflections';

const CHALLENGE_TYPE_LABEL = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };

const TYPES = [
  { key: 'daily', label: 'Diario', help: 'Cada día', icon: Sun, color: 'text-[hsl(var(--info))]' },
  { key: 'weekly', label: 'Semanal', help: 'Cada semana', icon: CalendarDays, color: 'text-primary' },
  { key: 'monthly', label: 'Mensual', help: 'Cada mes', icon: CalendarRange, color: 'text-[hsl(var(--virtus-secondary))]' },
];

const PLACEHOLDERS = {
  daily: 'Ej: Quiero estar fuerte para el verano',
  weekly: 'Ej: Quiero progresar con mi nivel de inglés',
  monthly: 'Ej: Quiero obtener más beneficios con mis inversiones',
};

function ChallengeBlock({
  type,
  challenge,
  generating,
  prompt,
  onPromptChange,
  onGenerate,
  onCompleteChallenge,
  onDelete,
}) {
  const Icon = type.icon;
  const rewards = challenge?.stat_rewards || challenge?.routine?.stat_rewards || {};

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className={type.color} strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-foreground">{type.label}</p>
            <p className="text-xs text-muted-foreground">{type.help}</p>
          </div>
        </div>

        {challenge ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">{challenge.title}</p>
              {challenge.prompt && (
                <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">“{challenge.prompt}”</p>
              )}
            </div>

            <StatRewardsChips rewards={rewards} />

            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline" className="font-medium">
                {challenge.metrics?.completion_rate ?? 0}% cumplimiento
              </Badge>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Flame size={13} className="text-primary" />
                {challenge.metrics?.streak ?? 0}
              </span>
              <span className="text-muted-foreground">
                {challenge.metrics?.completion_count ?? 0}/{challenge.metrics?.expected ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onCompleteChallenge(challenge)}
                className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
              >
                <CheckCircle2 size={14} className="mr-1" />
                Completar desafío
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(challenge.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </div>

            <ChallengeRoutineReflections routineId={challenge.routine_id} />
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={PLACEHOLDERS[type.key]}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onGenerate();
              }}
            />
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full"
            >
              <Sparkles size={14} className="mr-1" />
              {generating ? 'Generando...' : 'Crear desafío'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChallengesTab() {
  const {
    challenges,
    finishedChallenges,
    generatingType,
    showDraftModal,
    draft,
    confirming,
    fetchChallenges,
    fetchFinishedChallenges,
    generateChallenge,
    confirmChallenge,
    rejectDraft,
    completeChallenge,
    deleteChallenge,
    setShowDraftModal,
  } = useChallenges();

  const [prompts, setPrompts] = useState({ daily: '', weekly: '', monthly: '' });
  const [challengeToComplete, setChallengeToComplete] = useState(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetchChallenges();
    fetchFinishedChallenges();
  }, [fetchChallenges, fetchFinishedChallenges]);

  const finishedItems = finishedChallenges.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: c.prompt ? `“${c.prompt}”` : null,
    badge: CHALLENGE_TYPE_LABEL[c.challenge_type] || c.challenge_type,
    completed_at: c.completed_at,
    metrics: c.metrics,
  }));

  const activeByType = (type) =>
    challenges.find((c) => c.challenge_type === type && c.status === 'active') || null;

  const handleConfirmComplete = async () => {
    if (!challengeToComplete) return;
    setFinishing(true);
    try {
      await completeChallenge(challengeToComplete.id);
      setChallengeToComplete(null);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-full">
          <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-card">
            Activos
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-card">
            Historial {finishedItems.length > 0 && `(${finishedItems.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Proponte un desafío de cada tipo. El mentor diseñará una rutina recurrente que podrás ajustar y programar en el calendario.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TYPES.map((type) => (
              <ChallengeBlock
                key={type.key}
                type={type}
                challenge={activeByType(type.key)}
                generating={generatingType === type.key}
                prompt={prompts[type.key]}
                onPromptChange={(value) => setPrompts((p) => ({ ...p, [type.key]: value }))}
                onGenerate={() => generateChallenge(type.key, prompts[type.key])}
                onCompleteChallenge={setChallengeToComplete}
                onDelete={deleteChallenge}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <FinishedList
            items={finishedItems}
            emptyText="Aún no has finalizado ningún desafío."
          />
        </TabsContent>
      </Tabs>

      <ChallengeDraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        draft={draft}
        confirming={confirming}
        onConfirm={(edited) =>
          confirmChallenge(edited, () =>
            setPrompts((p) => ({ ...p, [draft.challenge_type]: '' }))
          )
        }
        onReject={rejectDraft}
      />

      {/* Confirm finishing the whole challenge */}
      <Dialog open={!!challengeToComplete} onOpenChange={(open) => !open && setChallengeToComplete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-[hsl(var(--success))]" />
              Completar desafío
            </DialogTitle>
            <DialogDescription>
              Si ya has finalizado por completo este desafío, puedes cerrarlo aquí. La rutina dejará de programarse en el calendario, pero se conservará el historial de cumplimiento.
            </DialogDescription>
          </DialogHeader>
          {challengeToComplete && (
            <p className="text-sm font-medium text-foreground">“{challengeToComplete.title}”</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChallengeToComplete(null)} disabled={finishing}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={finishing}
              className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
            >
              {finishing ? 'Cerrando...' : 'Sí, completar desafío'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
