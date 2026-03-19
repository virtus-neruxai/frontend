/**
 * ArenaPageRefactored.js
 * 
 * Purpose:
 * - Main arena page composition using hooks and components
 * - Clean Architecture pattern: separates business logic from UI
 * - Reduced from 805 lines to ~200 lines
 * 
 * Architecture:
 * - Hooks handle state and business logic (ViewModels)
 * - Components handle UI rendering (View layer)
 * - This file orchestrates composition (Controller/Coordinator)
 * 
 * Mobile Migration:
 * - Android: ArenaScreen.kt composable with ViewModels injection
 * - iOS: ArenaView.swift with ObservableObject ViewModels
 */

import React, { useState } from 'react';
import { Swords, Trophy, Users, Star, Clock, RefreshCw, Target, MessageSquare, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// Hooks (ViewModels)
import { useArena } from '../presentation/viewmodels/useArena';
import { usePvPBattles } from '../presentation/viewmodels/usePvPBattles';

// Components (View layer)
import { LeaderboardCard } from '../presentation/components/arena/LeaderboardCard';
import { MissionCard } from '../presentation/components/arena/MissionCard';
import { SubmissionsList } from '../presentation/components/arena/SubmissionsList';
import { PlayerProfileModal } from '../presentation/components/arena/PlayerProfileModal';
import { ReportModal } from '../presentation/components/arena/ReportModal';

export default function ArenaPageRefactored() {
  // ViewModels (business logic)
  const arena = useArena();
  const battles = usePvPBattles();
  
  // Local UI state
  const [activeTab, setActiveTab] = useState('mision');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // Refresh all data
  const handleRefresh = async () => {
    await Promise.all([arena.refresh(), battles.refresh()]);
  };
  
  // Switch to reflexiones tab (used by MissionCard)
  const handleSwitchToReflexiones = () => {
    setActiveTab('reflexiones');
  };
  
  // Switch to mission tab (used by SubmissionsList)
  const handleSwitchToMission = () => {
    setActiveTab('mision');
  };
  
  // Handle player click (from leaderboard or submission)
  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
  };
  
  // Loading state
  if (arena.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[8px] bg-primary/15 flex items-center justify-center">
              <Swords className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl">Arena Estoica</h1>
              <p className="text-sm text-muted-foreground">Compite con sabiduría</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Liga {arena.arenaInfo?.league || 1}</p>
                <p className="text-xs text-muted-foreground">Tu liga actual</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">#{arena.arenaInfo?.rank_in_room || '-'}</p>
                <p className="text-xs text-muted-foreground">Posición en sala</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Star className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {arena.arenaInfo?.current_score?.total_score || 0}
                </p>
                <p className="text-xs text-muted-foreground">Puntos totales</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Clock className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {arena.arenaInfo?.season_days_remaining || 0}d
                </p>
                <p className="text-xs text-muted-foreground">Fin temporada</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content with Tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid w-full grid-cols-2 bg-secondary/40">
                <TabsTrigger
                  value="mision"
                  className="flex items-center gap-2 text-foreground/80 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground"
                >
                  <Target className="w-4 h-4" />
                  Misión del Día
                </TabsTrigger>
                <TabsTrigger
                  value="reflexiones"
                  className="flex items-center gap-2 text-foreground/80 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground"
                >
                  <MessageSquare className="w-4 h-4" />
                  Reflexiones
                  {battles.submissions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{battles.submissions.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Mission Tab */}
              <TabsContent value="mision">
                <MissionCard
                  mission={battles.mission}
                  showSubmissionForm={battles.showSubmissionForm}
                  onToggleForm={battles.setShowSubmissionForm}
                  submissionText={battles.submissionText}
                  onTextChange={battles.setSubmissionText}
                  submissionImage={battles.submissionImage}
                  imagePreview={battles.imagePreview}
                  onImageChange={battles.handleImageChange}
                  onRemoveImage={battles.removeImage}
                  onSubmit={battles.handleSubmit}
                  submitting={battles.submitting}
                  results={battles.results}
                  onSwitchToReflexiones={handleSwitchToReflexiones}
                />
              </TabsContent>

              {/* Reflexiones Tab */}
              <TabsContent value="reflexiones">
                <SubmissionsList
                  mission={battles.mission}
                  submissions={battles.sortedSubmissions}
                  userHasVoted={battles.userHasVoted}
                  currentUserId={arena.arenaInfo?.user_id}
                  voting={battles.voting}
                  onVote={battles.handleVote}
                  onReport={battles.setReportingSubmission}
                  onPlayerClick={handlePlayerClick}
                  onSwitchToMission={handleSwitchToMission}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Leaderboard */}
          <LeaderboardCard
            roomInfo={arena.roomInfo}
            arenaInfo={arena.arenaInfo}
            membersWithScores={arena.membersWithScores}
            onPlayerClick={handlePlayerClick}
            seasonDaysRemaining={arena.arenaInfo?.season_days_remaining || 0}
          />
        </div>
      </div>

      {/* Player Profile Modal */}
      <PlayerProfileModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        membersWithScores={arena.membersWithScores}
        playerSubmissions={battles.getPlayerSubmissions(selectedPlayer?.user_id)}
        currentUserId={arena.arenaInfo?.user_id}
      />

      {/* Report Modal */}
      <ReportModal
        submission={battles.reportingSubmission}
        isOpen={!!battles.reportingSubmission}
        onClose={() => battles.setReportingSubmission(null)}
        reportReason={battles.reportReason}
        onReasonChange={battles.setReportReason}
        onSubmit={battles.handleReport}
      />
    </Layout>
  );
}
