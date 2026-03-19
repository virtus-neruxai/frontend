/**
 * SubmissionsList Component
 * 
 * Purpose:
 * - Display list of submissions/reflexiones
 * - Show voting status banner
 * - Handle voting on submissions
 * - Handle reporting submissions
 * - Trigger player profile modal
 * 
 * Props:
 * - mission: Current mission data
 * - submissions: Array of submissions
 * - userHasVoted: Boolean if user has voted
 * - currentUserId: ID of current user
 * - voting: ID of submission being voted on (loading state)
 * - onVote: Vote handler
 * - onReport: Report button click handler
 * - onPlayerClick: Player click handler
 * - onSwitchToMission: Callback to switch to mission tab
 * 
 * Mobile Migration:
 * - Android: SubmissionsList.kt LazyColumn composable
 * - iOS: SubmissionsList.swift List view
 */

import React from 'react';
import { MessageSquare, Target, CheckCircle, ThumbsUp, Clock, Loader2, Flag } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

export function SubmissionsList({
  mission,
  submissions = [],
  userHasVoted,
  currentUserId,
  voting,
  onVote,
  onReport,
  onPlayerClick,
  onSwitchToMission
}) {
  // If user hasn't submitted, show prompt
  if (!mission?.has_submitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-[#71717A] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Envía tu reflexión primero</h3>
          <p className="text-[#71717A] mb-4">Debes participar para ver las reflexiones de otros jugadores</p>
          <Button onClick={onSwitchToMission}>
            <Target className="w-4 h-4 mr-2" />
            Ir a la Misión
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If no submissions yet
  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-[#71717A] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aún no hay reflexiones</h3>
          <p className="text-[#71717A]">Sé el primero en participar hoy</p>
        </CardContent>
      </Card>
    );
  }

  // Sort submissions by created_at ascending (oldest first)
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <div className="space-y-4">
      {/* Voting Status Banner */}
      <Card className={userHasVoted ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {userHasVoted ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">
                  Ya has votado. Puedes cambiar tu voto hasta las 20:00
                </span>
              </>
            ) : mission?.status === 'active' ? (
              <>
                <ThumbsUp className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-700">
                  🗳️ Tienes 1 voto disponible. ¡Elige la mejor reflexión!
                </span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Votación cerrada</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {sortedSubmissions.map((sub) => (
        <Card 
          key={sub.id} 
          className={`transition-all ${
            sub.has_voted_for ? 'border-2 border-green-500 bg-green-50' : 'hover:border-orange-300'
          }`}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                onClick={() => onPlayerClick && onPlayerClick(sub)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold">
                  {sub.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{sub.username}</span>
                    {sub.user_id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">Tú</Badge>
                    )}
                  </div>
                  <span className="text-xs text-[#71717A]">
                    {new Date(sub.created_at).toLocaleString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {sub.votes_received} votos
                </Badge>
                {sub.has_voted_for && (
                  <Badge className="bg-green-500">✓ Tu voto</Badge>
                )}
              </div>
            </div>
            
            {/* Content */}
            <p className="text-sm text-[#52525B] whitespace-pre-wrap mb-3">{sub.text}</p>
            
            {/* Image if exists */}
            {sub.image_url && (
              <img src={sub.image_url} alt="Submission" className="max-h-48 rounded-lg mb-3" />
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#71717A] hover:text-red-500"
                onClick={() => onReport && onReport(sub)}
              >
                <Flag className="w-4 h-4 mr-1" />
                Reportar
              </Button>
              
              {mission?.status === 'active' && sub.user_id !== currentUserId && !sub.has_voted_for && (
                <Button
                  size="sm"
                  className={userHasVoted ? "bg-blue-500 hover:bg-blue-600" : "bg-orange-500 hover:bg-orange-600"}
                  onClick={() => onVote && onVote(sub.user_id)}
                  disabled={voting === sub.user_id}
                >
                  {voting === sub.user_id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 mr-2" />
                  )}
                  {userHasVoted ? "Cambiar voto aquí" : "Votar por esta reflexión"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
