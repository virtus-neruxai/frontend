/**
 * LeaderboardCard Component
 * 
 * Purpose:
 * - Display room leaderboard with rankings
 * - Show league info and promotion/relegation zones
 * - Handle player profile modal trigger
 * 
 * Props:
 * - roomInfo: Room data with leaderboard
 * - arenaInfo: Current user arena info
 * - membersWithScores: Sorted members with merged scores
 * - onPlayerClick: Callback when clicking a player
 * 
 * Mobile Migration:
 * - Android: LeaderboardCard.kt composable
 * - iOS: LeaderboardCard.swift SwiftUI view
 */

import React from 'react';
import { Trophy, Flame } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

export function LeaderboardCard({ 
  roomInfo, 
  arenaInfo, 
  membersWithScores = [], 
  onPlayerClick,
  seasonDaysRemaining = 0
}) {
  if (!roomInfo) return null;

  return (
    <div className="space-y-4">
      {/* Room Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Clasificación
            </CardTitle>
            <Badge>Liga {roomInfo.league}</Badge>
          </div>
          <CardDescription>{roomInfo.member_count}/{roomInfo.capacity} jugadores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {membersWithScores.map((member, idx) => {
              const displayRank = idx + 1;
              const isCurrentUser = member.user_id === arenaInfo?.user_id;
              
              // Calculate rank style
              const rankStyle = displayRank === 1 ? 'bg-yellow-400 text-yellow-900' :
                              displayRank === 2 ? 'bg-gray-300 text-gray-700' :
                              displayRank === 3 ? 'bg-orange-300 text-orange-800' :
                              displayRank <= 6 ? 'bg-green-100 text-green-700' :
                              displayRank > membersWithScores.length - 3 ? 'bg-red-100 text-red-700' :
                              'bg-[#F4F4F5] text-[#71717A]';
              
              return (
                <div 
                  key={member.user_id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                    isCurrentUser 
                      ? 'bg-orange-100 border-2 border-orange-300' 
                      : 'hover:bg-[#F4F4F5]'
                  }`}
                  onClick={() => onPlayerClick && onPlayerClick(member)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankStyle}`}>
                      {displayRank}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[100px]">
                        {member.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs text-orange-600">Tú</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{member.total_score} pts</span>
                    {member.wins > 0 && <span className="text-xs">🏆{member.wins}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-3 pt-3 border-t text-xs text-[#71717A] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-100"></span>
              Top 6: Suben de liga
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-100"></span>
              Bottom 3: Bajan de liga
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-medium">Temporada activa</span>
          </div>
          <div className="mt-2 text-sm text-[#71717A]">
            {seasonDaysRemaining} días restantes
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
