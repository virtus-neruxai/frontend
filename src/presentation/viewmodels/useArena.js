/**
 * useArena Hook
 * 
 * Domain: Arena PvP system
 * 
 * Purpose:
 * - Manage arena info (league, rank, score, season)
 * - Manage room info (leaderboard, members, capacity)
 * - Handle loading states
 * 
 * Mobile Migration:
 * - Android: ArenaViewModel.kt with LiveData/StateFlow
 * - iOS: ArenaViewModel.swift with @Published properties
 */

import { useState, useEffect, useCallback } from 'react';
import { arenaApi } from '../../lib/arenaApi';
import { toast } from 'sonner';

export function useArena() {
  const [loading, setLoading] = useState(true);
  const [arenaInfo, setArenaInfo] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  
  /**
   * Load arena and room data
   * 
   * Android equivalent:
   * suspend fun loadArenaData() {
   *   _loading.value = true
   *   try {
   *     val info = repository.getArenaInfo()
   *     _arenaInfo.value = info
   *     val room = repository.getRoomInfo(info.roomId)
   *     _roomInfo.value = room
   *   } catch (e: Exception) {
   *     // handle error
   *   } finally {
   *     _loading.value = false
   *   }
   * }
   */
  const loadArenaData = useCallback(async () => {
    try {
      setLoading(true);
      // Get user arena info first
      const meRes = await arenaApi.getMe();
      setArenaInfo(meRes.data);
      
      // Get room info using room_id from user info
      if (meRes.data.room_id) {
        const roomRes = await arenaApi.getRoom(meRes.data.room_id);
        setRoomInfo(roomRes.data);
      }
    } catch (error) {
      console.error('Error loading arena data:', error);
      toast.error('Error al cargar datos de la arena');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadArenaData();
  }, [loadArenaData]);

  /**
   * Sort leaderboard by score and rank
   * 
   * Pure function - can be moved to domain layer
   * Android: extension function or domain use case
   */
  const getSortedLeaderboard = useCallback(() => {
    if (!roomInfo?.leaderboard?.length) return [];
    
    return [...roomInfo.leaderboard].sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.rank - b.rank;
    });
  }, [roomInfo]);

  /**
   * Get members with scores merged
   * 
   * Combines room members with leaderboard data
   * Android: domain use case or repository mapper
   */
  const getMembersWithScores = useCallback(() => {
    if (!roomInfo?.members?.length) return [];
    
    const sortedLeaderboard = getSortedLeaderboard();
    
    return roomInfo.members.map((member, idx) => {
      const scoreEntry = sortedLeaderboard.find(l => l.user_id === member.user_id);
      return {
        ...member,
        total_score: scoreEntry?.total_score || 0,
        wins: scoreEntry?.wins || 0,
        traits: scoreEntry?.traits || {},
        rank: scoreEntry?.rank || (sortedLeaderboard.length + idx + 1)
      };
    }).sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return a.rank - b.rank;
    });
  }, [roomInfo, getSortedLeaderboard]);

  return {
    // State
    loading,
    arenaInfo,
    roomInfo,
    
    // Computed
    sortedLeaderboard: getSortedLeaderboard(),
    membersWithScores: getMembersWithScores(),
    
    // Actions
    refresh: loadArenaData
  };
}
