/**
 * PlayerProfileModal Component
 * 
 * Purpose:
 * - Display detailed player profile in modal
 * - Show stats (points, wins, rank)
 * - Show trait scores
 * - Show player's submissions for current mission
 * 
 * Props:
 * - player: Selected player data
 * - isOpen: Boolean modal open state
 * - onClose: Close handler
 * - membersWithScores: Array to find player rank
 * - playerSubmissions: Array of player's submissions
 * 
 * Mobile Migration:
 * - Android: BottomSheet or Dialog composable
 * - iOS: Sheet or fullScreenCover SwiftUI modifier
 */

import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';

// Trait configuration
const TRAIT_CONFIG = {
  sabiduria: { label: 'Sabiduría', icon: '🦉' },
  esfuerzo: { label: 'Esfuerzo', icon: '💪' },
  dicotomia_del_control: { label: 'Dicotomía del Control', icon: '⚖️' },
  rectitud: { label: 'Rectitud', icon: '⚔️' },
  humildad: { label: 'Humildad', icon: '🙏' }
};

export function PlayerProfileModal({
  player,
  isOpen,
  onClose,
  membersWithScores = [],
  playerSubmissions = [],
  currentUserId
}) {
  if (!player) return null;

  const playerRank = membersWithScores.findIndex(m => m.user_id === player.user_id) + 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold text-lg">
              {player.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg">{player.username}</div>
              {player.user_id === currentUserId && (
                <Badge variant="secondary">Tu perfil</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-[#F4F4F5] rounded-lg">
              <div className="text-2xl font-bold">{player.total_score || 0}</div>
              <div className="text-xs text-[#71717A]">Puntos</div>
            </div>
            <div className="text-center p-3 bg-[#F4F4F5] rounded-lg">
              <div className="text-2xl font-bold">{player.wins || 0}</div>
              <div className="text-xs text-[#71717A]">Victorias</div>
            </div>
            <div className="text-center p-3 bg-[#F4F4F5] rounded-lg">
              <div className="text-2xl font-bold">#{playerRank}</div>
              <div className="text-xs text-[#71717A]">Posición</div>
            </div>
          </div>

          {/* Traits */}
          {player.traits && Object.keys(player.traits).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Atributos</h4>
              {Object.entries(TRAIT_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span>{config.icon} {config.label}</span>
                  <span className="font-medium">{player.traits[key] || 0}</span>
                </div>
              ))}
            </div>
          )}

          {/* Player's submissions in current mission */}
          {playerSubmissions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Reflexión de hoy</h4>
              {playerSubmissions.map(sub => (
                <div key={sub.id} className="p-3 bg-[#F4F4F5] rounded-lg text-sm">
                  <p className="text-[#52525B]">{sub.text}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#71717A]">
                    <ThumbsUp className="w-3 h-3" />
                    {sub.votes_received} votos
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
