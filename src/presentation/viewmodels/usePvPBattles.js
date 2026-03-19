/**
 * usePvPBattles Hook
 * 
 * Domain: Arena PvP battles, submissions, and voting
 * 
 * Purpose:
 * - Manage daily mission state
 * - Handle submission creation (text + image)
 * - Manage voting system
 * - Handle reporting submissions
 * 
 * Mobile Migration:
 * - Android: PvPBattlesViewModel.kt with StateFlow/SharedFlow
 * - iOS: PvPBattlesViewModel.swift with @Published and Combine
 */

import { useState, useEffect, useCallback } from 'react';
import { arenaApi } from '../../lib/arenaApi';
import { toast } from 'sonner';

// Max image size: 5MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function normalizeSubmissionsResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      submissions: payload,
      userHasVoted: payload.some((s) => s?.has_voted_for),
    };
  }

  if (payload && Array.isArray(payload.submissions)) {
    return {
      submissions: payload.submissions,
      userHasVoted:
        Boolean(payload.user_has_voted) ||
        payload.submissions.some((s) => s?.has_voted_for),
    };
  }

  return {
    submissions: [],
    userHasVoted: false,
  };
}

export function usePvPBattles() {
  const [mission, setMission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState(null);
  const [userHasVoted, setUserHasVoted] = useState(false);
  
  // Submission form state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionImage, setSubmissionImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Voting state
  const [voting, setVoting] = useState(null);
  
  // Reporting state
  const [reportingSubmission, setReportingSubmission] = useState(null);
  const [reportReason, setReportReason] = useState('');
  
  /**
   * Load mission, submissions, and results
   * 
   * Android equivalent:
   * suspend fun loadBattleData() {
   *   try {
   *     val mission = repository.getTodayMission()
   *     _mission.value = mission
   *     if (mission.hasSubmitted) {
   *       val submissions = repository.getSubmissions(mission.id)
   *       _submissions.value = submissions
   *       _userHasVoted.value = submissions.any { it.hasVotedFor }
   *     }
   *     if (mission.status == "closed") {
   *       val results = repository.getResults(mission.id)
   *       _results.value = results
   *     }
   *   } catch (e: Exception) {
   *     // handle error
   *   }
   * }
   */
  const loadBattleData = useCallback(async () => {
    try {
      // Load today's mission
      const missionRes = await arenaApi.getTodayMission();
      const missionData = missionRes?.data ?? null;
      setMission(missionData);
      
      // Load submissions if user has participated
      if (missionData?.has_submitted) {
        const submissionsRes = await arenaApi.getSubmissions(missionData.id);
        const normalized = normalizeSubmissionsResponse(submissionsRes?.data);
        setSubmissions(normalized.submissions);
        setUserHasVoted(normalized.userHasVoted);
      } else {
        setSubmissions([]);
        setUserHasVoted(false);
      }
      
      // Load results if mission is closed
      if (missionData?.status === 'closed') {
        const resultsRes = await arenaApi.getMissionResults(missionData.id);
        setResults(resultsRes.data);
      } else {
        setResults(null);
      }
    } catch (error) {
      console.error('Error loading battle data:', error);
      setSubmissions([]);
      setUserHasVoted(false);
      setResults(null);
      if (error.response?.status === 404) {
        setMission(null);
      }
      // Don't show error toast for 404 (no mission yet)
      if (error.response?.status !== 404) {
        toast.error('Error al cargar datos de batalla');
      }
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadBattleData();
  }, [loadBattleData]);

  /**
   * Handle image selection and validation
   * 
   * Android equivalent:
   * fun onImageSelected(uri: Uri) {
   *   val size = getImageSize(uri)
   *   if (size > MAX_IMAGE_SIZE) {
   *     showError("Imagen muy grande")
   *     return
   *   }
   *   _submissionImage.value = uri
   *   _imagePreview.value = loadBitmap(uri)
   * }
   */
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }
    
    setSubmissionImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  /**
   * Remove selected image
   */
  const removeImage = useCallback(() => {
    setSubmissionImage(null);
    setImagePreview(null);
  }, []);

  /**
   * Submit reflection with optional image
   * 
   * Android equivalent:
   * suspend fun submitReflection(text: String, image: Uri?) {
   *   _submitting.value = true
   *   try {
   *     val imageBase64 = image?.let { encodeToBase64(it) }
   *     repository.submitReflection(missionId, text, imageBase64)
   *     showSuccess("Reflexión enviada")
   *     resetForm()
   *     loadBattleData()
   *   } catch (e: Exception) {
   *     showError(e.message)
   *   } finally {
   *     _submitting.value = false
   *   }
   * }
   */
  const handleSubmit = useCallback(async () => {
    if (!mission?.id) return;
    if (submissionText.length < 10) {
      toast.error('La reflexión debe tener al menos 10 caracteres');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Convert image to base64 if exists
      let imageBase64 = null;
      if (submissionImage) {
        imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(submissionImage);
        });
      }
      
      await arenaApi.submitReflection(mission.id, { 
        text: submissionText,
        image_base64: imageBase64
      });
      
      toast.success('¡Reflexión enviada!');
      
      // Reset form
      setSubmissionText('');
      setSubmissionImage(null);
      setImagePreview(null);
      setShowSubmissionForm(false);
      
      // Reload data
      await loadBattleData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar reflexión');
    } finally {
      setSubmitting(false);
    }
  }, [mission, submissionText, submissionImage, loadBattleData]);

  /**
   * Vote for a submission
   * 
   * Android equivalent:
   * suspend fun vote(userId: Int) {
   *   _voting.value = userId
   *   try {
   *     val response = repository.vote(missionId, userId)
   *     showSuccess(if (response.isChange) "Voto cambiado" else "Voto registrado")
   *     loadBattleData()
   *   } catch (e: Exception) {
   *     showError(e.message)
   *   } finally {
   *     _voting.value = null
   *   }
   * }
   */
  const handleVote = useCallback(async (targetUserId) => {
    if (!mission?.id) return;
    
    try {
      setVoting(targetUserId);
      const response = await arenaApi.vote(mission.id, targetUserId);
      const message = response.data.is_change ? '¡Voto cambiado!' : '¡Voto registrado!';
      toast.success(message);
      await loadBattleData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al votar');
    } finally {
      setVoting(null);
    }
  }, [mission, loadBattleData]);

  /**
   * Report a submission
   * 
   * Android equivalent:
   * suspend fun reportSubmission(submissionId: Int, reason: String) {
   *   try {
   *     repository.reportSubmission(submissionId, reason)
   *     showSuccess("Reporte enviado")
   *     _reportingSubmission.value = null
   *     _reportReason.value = ""
   *   } catch (e: Exception) {
   *     showError(e.message)
   *   }
   * }
   */
  const handleReport = useCallback(async () => {
    if (!reportingSubmission?.id || !reportReason) {
      toast.error('Selecciona un motivo');
      return;
    }
    
    try {
      await arenaApi.reportSubmission(reportingSubmission.id, reportReason);
      toast.success('Reporte enviado');
      setReportingSubmission(null);
      setReportReason('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al reportar');
    }
  }, [reportingSubmission, reportReason]);

  /**
   * Get player's submissions in current mission
   */
  const getPlayerSubmissions = useCallback((userId) => {
    if (!Array.isArray(submissions)) return [];
    return submissions.filter((s) => s.user_id === userId);
  }, [submissions]);

  /**
   * Get sorted submissions (oldest first)
   */
  const getSortedSubmissions = useCallback(() => {
    if (!Array.isArray(submissions)) return [];
    return [...submissions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
  }, [submissions]);

  return {
    // Mission state
    mission,
    submissions,
    results,
    userHasVoted,
    
    // Submission form state
    showSubmissionForm,
    setShowSubmissionForm,
    submissionText,
    setSubmissionText,
    submissionImage,
    imagePreview,
    submitting,
    
    // Voting state
    voting,
    
    // Reporting state
    reportingSubmission,
    setReportingSubmission,
    reportReason,
    setReportReason,
    
    // Actions
    handleImageChange,
    removeImage,
    handleSubmit,
    handleVote,
    handleReport,
    refresh: loadBattleData,
    
    // Computed
    getPlayerSubmissions,
    sortedSubmissions: getSortedSubmissions()
  };
}
