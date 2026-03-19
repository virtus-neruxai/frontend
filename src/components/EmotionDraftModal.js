import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Brain, Clock, Heart } from 'lucide-react';
import { getProfileName } from '../lib/profileUtils';

const INTENSITY_LABELS = {
  1: 'Muy Leve',
  2: 'Leve',
  3: 'Moderada',
  4: 'Fuerte',
  5: 'Muy Fuerte'
};

const INTENSITY_COLORS = {
  1: 'bg-blue-200',
  2: 'bg-blue-400',
  3: 'bg-orange-400',
  4: 'bg-orange-600',
  5: 'bg-red-600'
};

export default function EmotionDraftModal({ isOpen, onClose, draftData, onConfirm, onReject }) {
  const [editedData, setEditedData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const profileName = getProfileName(localStorage.getItem('prompt_profile') || 'stoic');

  useEffect(() => {
    if (draftData?.data) {
      setEditedData({
        emotion: draftData.data.emotion || '',
        source: draftData.data.source || 'mentor',
        polarity: draftData.data.polarity || 'neutral',
        intensity: draftData.data.intensity || 3,
        note: draftData.data.note || '',
        occurred_at: draftData.data.occurred_at ? formatDateTimeLocal(draftData.data.occurred_at) : ''
      });
    }
  }, [draftData]);

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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...editedData,
        source: editedData.source || 'mentor',
        occurred_at: editedData.occurred_at ? new Date(editedData.occurred_at).toISOString() : null,
      };
      
      await onConfirm(payload);
      onClose();
    } catch (error) {
      console.error('Error confirming emotion draft:', error);
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
      console.error('Error rejecting emotion draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draftData) return null;

  const metadata = draftData.metadata || {};
  const emoji = draftData.data?.emoji || '😐';
  const polarity = draftData.data?.polarity || 'neutral';

  const polarityColors = {
    positive: 'bg-green-100 border-green-300 text-green-800',
    negative: 'bg-red-100 border-red-300 text-red-800',
    neutral: 'bg-gray-100 border-gray-300 text-gray-800'
  };

  const polarityLabels = {
    positive: 'Positiva',
    negative: 'Negativa',
    neutral: 'Neutral'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#C1502E]" />
            Emoción Detectada por el Mentor {profileName}
          </DialogTitle>
          <DialogDescription>
            Revisa y edita el registro emocional antes de confirmarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Reasoning */}
          {metadata.agent_reasoning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Razonamiento del Mentor</p>
                  <p className="text-sm text-amber-700 mt-1">{metadata.agent_reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Score */}
          {metadata.confidence && (
            <div className="flex items-center gap-2">
              <Badge variant={metadata.confidence > 0.7 ? 'default' : 'secondary'}>
                Confianza: {(metadata.confidence * 100).toFixed(0)}%
              </Badge>
              {metadata.expires_in_seconds && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Expira en {Math.floor(metadata.expires_in_seconds / 60)} min
                </Badge>
              )}
            </div>
          )}

          {/* Emotion Display */}
          <div className={`p-6 rounded-lg border-2 text-center ${polarityColors[polarity]}`}>
            <div className="text-6xl mb-3">{emoji}</div>
            <h3 className="text-2xl font-bold mb-2">{editedData.emotion}</h3>
            <Badge className={`${polarityColors[polarity]}`}>
              {polarityLabels[polarity]}
            </Badge>
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <Label>Intensidad: {INTENSITY_LABELS[editedData.intensity || 3]}</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEditedData({ ...editedData, intensity: level })}
                  className={`flex-1 h-12 rounded-lg border-2 transition-all ${
                    editedData.intensity === level
                      ? `${INTENSITY_COLORS[level]} border-gray-700 scale-105`
                      : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                  }`}
                  title={INTENSITY_LABELS[level]}
                >
                  <span className="text-sm font-medium">{level}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              ⭐ {Array(editedData.intensity || 3).fill('⭐').join('')} ({editedData.intensity}/5)
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Nota / Contexto</Label>
            <Textarea
              id="note"
              value={editedData.note || ''}
              onChange={(e) => setEditedData({ ...editedData, note: e.target.value })}
              placeholder="Añade más contexto sobre esta emoción..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{editedData.note?.length || 0}/500 caracteres</p>
          </div>

          {/* Timestamp */}
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Cuándo ocurrió</Label>
            <input
              id="occurred_at"
              type="datetime-local"
              value={editedData.occurred_at || ''}
              onChange={(e) => setEditedData({ ...editedData, occurred_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C1502E]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            Rechazar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !editedData.emotion}
            className="bg-[#C1502E] hover:bg-[#A03F25]"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
