import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Target, Clock, Brain, TrendingUp, Calendar, Star } from 'lucide-react';
import { getProfileName } from '../lib/profileUtils';
import { formatStatLabel } from '../lib/statUtils';
import { useProfileTheme } from '../theme/useProfileTheme';
import { useDndSettings } from '../hooks/useDndSettings';
import { snapLocalStringOutOfDnd } from '../lib/dnd';
import { normalizeTaskDomain, TASK_DOMAIN_OPTIONS } from '../lib/taskDomains';

const MISSION_TYPE_LABELS = {
  daily: 'Diaria',
  weekly: 'Semanal',
  long_term: 'A Largo Plazo',
  reflection: 'Reflexión'
};

const MISSION_TYPE_COLORS = {
  daily: 'bg-[hsl(var(--info))]',
  weekly: 'bg-primary',
  long_term: 'bg-[hsl(var(--virtus-secondary))]',
  reflection: 'bg-[hsl(var(--muted-foreground))]'
};

const DIFFICULTY_LABELS = {
  1: 'Muy Fácil',
  2: 'Fácil',
  3: 'Moderado',
  4: 'Difícil',
  5: 'Muy Difícil'
};

const STAT_ICONS = {
  autodominio: '🛡️',
  claridad: '💡',
  disciplina: '⚡',
  virtud: '⭐',
  serenidad: '🧘'
};

export default function MissionDraftModal({ isOpen, onClose, draftData, onConfirm, onReject }) {
  const { profileId } = useProfileTheme();
  const dnd = useDndSettings();
  const [editedData, setEditedData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const profileName = getProfileName(profileId);

  const defaultDueDate = (missionType, baseDate) => {
    const ttl = { daily: 1, weekly: 7, long_term: 30, reflection: 7 }[missionType] ?? 7;
    const d = baseDate ? new Date(baseDate) : new Date();
    d.setDate(d.getDate() + ttl);
    d.setHours(23, 59, 0, 0);
    return formatDateTimeLocal(d.toISOString());
  };

  useEffect(() => {
    if (draftData?.data) {
      const missionType = draftData.data.mission_type || 'daily';
      setEditedData({
        title: draftData.data.title || '',
        description: draftData.data.description || '',
        mission_type: missionType,
        difficulty: draftData.data.difficulty || 2,
        estimated_minutes: draftData.data.estimated_minutes || 30,
        target_stats: draftData.data.target_stats || [],
        stat_rewards: draftData.data.stat_rewards || {},
        domain: normalizeTaskDomain(draftData.data.domain, 'Hábitos'),
        addToCalendar: draftData.data.addToCalendar !== false,
        start_date: draftData.data.start_date ? formatDateTimeLocal(draftData.data.start_date) : '',
        due_date: draftData.data.due_date
          ? formatDateTimeLocal(draftData.data.due_date)
          : defaultDueDate(missionType, draftData.data.start_date || null)
      });
    }
  }, [draftData]);

  // Never keep a *proposed* calendar start inside the user's DND window.
  useEffect(() => {
    if (!draftData?.data) return;
    setEditedData((prev) => {
      if (!prev.start_date) return prev;
      const snapped = snapLocalStringOutOfDnd(prev.start_date, dnd);
      return snapped === prev.start_date ? prev : { ...prev, start_date: snapped };
    });
  }, [dnd, draftData]);

  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Convert datetime-local to ISO strings
      const payload = {
        ...editedData,
        domain: normalizeTaskDomain(editedData.domain, 'Hábitos'),
        start_date: editedData.start_date ? new Date(editedData.start_date).toISOString() : null,
        due_date: editedData.due_date ? new Date(editedData.due_date).toISOString() : null,
      };
      
      await onConfirm(payload);
      onClose();
    } catch (error) {
      console.error('Error confirming draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
      onClose();
    } catch (error) {
      console.error('Error rejecting draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draftData) return null;

  const metadata = draftData.metadata || {};
  const relatedTo = draftData.data?.related_to || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Misión Propuesta por el Mentor {profileName}
          </DialogTitle>
          <DialogDescription>
            El mentor ha preparado una misión para desarrollar tu carácter. Revisa y ajusta antes de aceptarla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Reasoning */}
          {metadata.agent_reasoning && (
            <div className="p-3 bg-[hsl(var(--warning-soft))] border border-[hsl(var(--warning))] rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Razonamiento del Mentor</p>
                  <p className="text-sm text-muted-foreground mt-1">{metadata.agent_reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Context: Related To */}
          {relatedTo.summary && (
            <div className="p-3 bg-[hsl(var(--info-soft))] border border-[hsl(var(--info))] rounded-lg">
              <p className="text-xs font-medium text-foreground mb-1">Contexto</p>
              <p className="text-sm text-muted-foreground">{relatedTo.summary}</p>
            </div>
          )}

          {/* Confidence and Expiry */}
          <div className="flex items-center gap-2 flex-wrap">
            {metadata.confidence && (
              <Badge variant={metadata.confidence > 0.7 ? 'default' : 'secondary'}>
                Confianza: {(metadata.confidence * 100).toFixed(0)}%
              </Badge>
            )}
            {metadata.expires_in_seconds && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Expira en {Math.floor(metadata.expires_in_seconds / 60)} min
              </Badge>
            )}
            <Badge className={MISSION_TYPE_COLORS[editedData.mission_type]}>
              {MISSION_TYPE_LABELS[editedData.mission_type]}
            </Badge>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Misión</Label>
            <Input
              id="title"
              value={editedData.title}
              onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              placeholder="Título conciso y accionable"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">{editedData.title?.length || 0}/60 caracteres</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              placeholder="¿Qué implica esta misión?"
              rows={4}
            />
          </div>

          {/* Mission Type and Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mission_type">Tipo de Misión</Label>
              <Select
                value={editedData.mission_type}
                onValueChange={(value) => setEditedData({ ...editedData, mission_type: value })}
              >
                <SelectTrigger id="mission_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="long_term">A Largo Plazo</SelectItem>
                  <SelectItem value="reflection">Reflexión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificultad</Label>
              <Select
                value={editedData.difficulty?.toString()}
                onValueChange={(value) => setEditedData({ ...editedData, difficulty: parseInt(value) })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      {'⭐'.repeat(level)} {DIFFICULTY_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission_domain">Dominio *</Label>
            <Select
              value={editedData.domain || 'Hábitos'}
              onValueChange={(value) => setEditedData({ ...editedData, domain: value })}
            >
              <SelectTrigger id="mission_domain" data-testid="mission-domain-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_DOMAIN_OPTIONS.map((domain) => (
                  <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">Tiempo Estimado (minutos)</Label>
            <Input
              id="estimated_minutes"
              type="number"
              min="5"
              max="180"
              value={editedData.estimated_minutes}
              onChange={(e) => setEditedData({ ...editedData, estimated_minutes: parseInt(e.target.value) })}
            />
          </div>

          {/* Target Stats & Rewards */}
          <div className="space-y-2">
            <Label>Estadísticas a Mejorar</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(editedData.stat_rewards || {}).map(([stat, reward]) => (
                <div key={stat} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                  <span className="text-2xl">{STAT_ICONS[stat] || '✨'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formatStatLabel(stat)}</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
                      <span className="text-xs text-[hsl(var(--success))] font-semibold">+{reward}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!editedData.addToCalendar}
              onChange={(e) => setEditedData({ ...editedData, addToCalendar: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Añadir al calendario
          </label>

          <div className="grid grid-cols-2 gap-4">
            {editedData.addToCalendar && (
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha en Calendario *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={editedData.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setEditedData({
                      ...editedData,
                      start_date: newStart,
                      due_date: defaultDueDate(editedData.mission_type, newStart),
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {editedData.start_date
                    ? <><Calendar className="w-3 h-3 inline mr-1" />{formatDisplayDate(new Date(editedData.start_date).toISOString())}</>
                    : 'La tarea de la misión se creará en esta fecha'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimiento</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={editedData.due_date}
                onChange={(e) => setEditedData({ ...editedData, due_date: e.target.value })}
              />
              {editedData.due_date && (
                <p className="text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {formatDisplayDate(new Date(editedData.due_date).toISOString())}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            Rechazar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !editedData.title || (editedData.addToCalendar && !editedData.start_date)}
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
          >
            {isSubmitting ? 'Confirmando...' : 'Aceptar Misión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
