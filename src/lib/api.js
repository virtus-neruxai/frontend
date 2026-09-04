import axios from 'axios';

import { normalizeQuotaError } from './quotaError';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(normalizeQuotaError(error));
  }
);

// Task API — backed by /items?item_type=task
export const tasksApi = {
  getAll: (params = {}) => api.get('/items', { params: { ...params, item_type: 'task' } }),
  create: (data) => api.post('/items', { ...data, item_type: 'task' }),
  update: (id, data) => api.patch(`/items/${id}`, data),
  patch: (id, data) => api.patch(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  // Mark a routine occurrence (a specific date) as completed. Defaults to today.
  markRoutineToday: (id, data = {}) => api.post(`/items/${id}/complete-occurrence`, data),
  completeOccurrence: (id, date = null) =>
    api.post(`/items/${id}/complete-occurrence`, date ? { date } : {}),
};

// Challenges API — desafíos programados como rutinas recurrentes
export const challengesApi = {
  getAll: (params = {}) => api.get('/challenges', { params }),
  dashboard: () => api.get('/challenges/dashboard'),
  generate: (data) => api.post('/challenges/generate', data),
  confirm: (data) => api.post('/challenges/confirm', data),
  complete: (id) => api.post(`/challenges/${id}/complete`),
  remove: (id) => api.delete(`/challenges/${id}`),
};


// Stats API
export const statsApi = {
  getSummary: (params = {}) => api.get('/stats/summary', { params }),
  getTimeseries: (days = 30) => api.get('/stats/timeseries', { params: { days } }),
  getEvolution: (params = {}) => api.get('/stats/evolution', { params }),
  getFrictions: (params = {}) => api.get('/stats/frictions', { params }),
  getFrictionLabels: () => api.get('/stats/friction-labels'),
  acknowledgeFriction: (friction, data) => api.patch(`/stats/frictions/${friction}/acknowledge`, data),
  getEmotionalPatterns: (params = {}) => api.get('/stats/emotional-patterns', { params }),
  acknowledgeEmotionalPattern: (patternKey, data) =>
    api.patch(`/stats/emotional-patterns/${encodeURIComponent(patternKey)}/acknowledge`, data),
  getPositiveReflections: (params = {}) => api.get('/stats/positive-reflections', { params }),
};

// Character API
export const characterApi = {
  get: () => api.get('/character'),
  getStatsInfo: (params = {}) => api.get('/character/stats-info', { params }),
};

// Missions API — backed by /items?item_type=mission
export const missionsApi = {
  getAll: (params = {}) => api.get('/items', { params: { ...params, item_type: 'mission' } }),
  generate: (data = {}) => api.post('/items/generate-with-context', data),
  complete: (id, data = {}) => api.patch(`/items/${id}`, {
    status: data.success === false ? 'failed' : 'done',
    is_complete: data.success !== false,
  }),
  nightlyReview: () => agentApiInstance.post('/agent/nightly-review'),
  confirmMissions: (missions) => api.post('/items/confirm', { missions }),
  schedule: (missionId, data) => api.patch(`/items/${missionId}`, data),
  remove: (missionId) => api.delete(`/items/${missionId}`),
};

// Emotions API — canonical catalog, single source of truth shared with mobile/backend.
export const emotionsApi = {
  getCatalog: () => api.get('/emotions/catalog'),
};

// Reflections API
export const reflectionsApi = {
  getAll: (params = {}) => {
    const normalizedParams = typeof params === 'string' ? { date: params } : params;
    return api.get('/reflections', { params: normalizedParams || {} });
  },
  getHistory: (limit = 100, date) => api.get('/reflections/history', { params: { limit, ...(date ? { date } : {}) } }),
  create: (data) => api.post('/reflections', data),
};

// Body Check-ins API — contexto fisiológico diario, independiente del Diario.
// Payload y estado propios: nunca se mezcla con reflections. El borrado por
// privacidad existe en backend (DELETE) pero no se expone en Caracter.
export const bodyCheckinsApi = {
  getByDate: (date) => api.get(`/body-checkins/${date}`),
  getRange: (params = {}) => api.get('/body-checkins', { params }),
  save: (date, data) => api.put(`/body-checkins/${date}`, data),
  getSummary: (days = 7) => api.get('/stats/body-checkins', { params: { days } }),
  getEvolution: (params = {}) => api.get('/body-checkins/stats/evolution', { params }),
};

// Notifications API
export const notificationsApi = {
  getHistory: (params = {}) => api.get('/notifications/history', { params }),
  markRead: (data) => api.post('/notifications/read', data),
  markNightlyReviewProposalStatus: (data) => api.post('/notifications/nightly-review/proposal-status', data),
  getAnalytics: (days = 7) => api.get('/notifications/analytics', { params: { days } }),
  getSettings: () => api.get('/notifications/settings'),
  saveSettings: (data) => api.post('/notifications/settings', data),
};

// Agent API (usa /agent-api/v1 - Traefik stripea /agent-api)
const agentApiInstance = axios.create({
  baseURL: `${API_URL}/agent-api/v1`,
});

agentApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

agentApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(normalizeQuotaError(error));
  }
);

// Which confirmation modal a `ui_action` opens. Shared by a live chat turn
// (useAgentChat/useHealthChat) and by draft recovery on page load
// (MentorPage/HealthMentorChatTab): both end up with the same `{action}` shape
// and must classify it the same way.
export const draftTypeFromAction = (action) => {
  if (action === 'SHOW_MISSION_CONFIRMATION_MODAL') return 'mission';
  if (action === 'SHOW_PROJECT_CONFIRMATION_MODAL') return 'project';
  return 'task';
};

export const agentApi = {
  chat: (message, sessionId, deepReasoning = false, userDataQa = false, projectPlan = false) =>
    agentApiInstance.post('/agent/chat', {
      message,
      session_id: sessionId,
      deep_reasoning: deepReasoning,
      user_data_qa: userDataQa,
      project_plan: projectPlan,
    }),
  confirmDraft: (data) => agentApiInstance.post('/agent/draft/confirm', data),
  // A draft outlives the tab that received it — it sits in Redis for
  // REDIS_DRAFT_TTL (1h) regardless of what the browser remembers. This is
  // how a page recovers it after a reload: `sessionId` scopes the search to
  // the active conversation so "Nueva Conversación" does not resurrect a
  // proposal from a thread already left behind.
  getPendingDrafts: (sessionId) =>
    agentApiInstance.get('/agent/drafts', { params: { session_id: sessionId } }),
  // "Mi centro" → Crear tarea/misión/rutina (euler-application.md §6.5). Same
  // plain-JWT handoff the diary reflection already uses — the frontend never
  // sends more than the final reflection's text, its provenance and the
  // action the user explicitly picked.
  // `options` lo usa el seguimiento de objetivos de Salud, que propone por
  // esta misma vía: cambia la procedencia y marca la superficie sanitaria para
  // que el borrador y su confirmación no acaben entre las del Mentor general.
  reviewHandoff: (message, actionType, options = {}) =>
    agentApiInstance.post('/agent/review/handoff', {
      message,
      source: options.source || 'center',
      action_type: actionType,
      health_surface: Boolean(options.healthSurface),
    }),
};

// Health Mentor API — superficie sanitaria, separada del Mentor general.
//
// Comparte `agentApiInstance` (mismo host, mismo token, mismo manejo de 401)
// pero NADA de su contrato: endpoint propio, historial propio y solo dos
// toggles. "Datos de la app" no existe aquí — el backend devuelve 422 si
// llega `user_data_qa`, así que enviarlo sería un error, no una opción.
export const healthAgentApi = {
  // `usePersonalData` es ortogonal a los dos modos y va el ultimo a proposito:
  // los cinco primeros parametros son los que ya existian, asi que ninguna
  // llamada previa cambia de significado al anadirlo.
  chat: (
    message, sessionId, deepReasoning = false, projectPlan = false,
    resetSession = false, usePersonalData = false,
  ) =>
    agentApiInstance.post('/agent/health-chat', {
      message,
      session_id: sessionId,
      deep_reasoning: deepReasoning,
      project_plan: projectPlan,
      reset_session: resetSession,
      use_personal_data: usePersonalData,
    }),
  // Un único hilo por usuario, sin filtro de perfil: una lesión contada bajo una
  // voz sigue siendo la misma lesión bajo otra.
  getInteractions: (params = {}) =>
    agentApiInstance.get('/agent/health-chat/interactions', {
      params: { limit: 200, skip: 0, ...params },
    }),
  // Same recovery as agentApi.getPendingDrafts, scoped server-side to the
  // health surface's own drafts.
  getPendingDrafts: (sessionId) =>
    agentApiInstance.get('/agent/health-chat/drafts', { params: { session_id: sessionId } }),
  // Al reconceder el recuerdo hay que volver a indexar: el backend purga al
  // revocar pero no puede restaurar, porque las notas viven en agent-service.
  // Devuelve 409 si el consentimiento no esta concedido, en vez de indexar cero
  // notas y reportar exito — que se leeria como que la concesion habia fallado.
  reindexNotes: () => agentApiInstance.post('/agent/health-chat/notes/reindex'),
};

// Health activities API — the person's own record of what they did (meals,
// sessions, rest, measurements). Canonical data, never a retrieval candidate:
// nothing here publishes to the outbox (see backend/routes/health_activities.py).
export const healthActivitiesApi = {
  getAll: (params = {}) => api.get('/health-activities', { params }),
  // La otra mitad del mismo gesto: las notas libres de los registros comparten
  // el scope `health_note_recall` y la misma purga, asi que reconceder tiene
  // que republicar las dos cosas o la memoria vuelve a medias.
  reindexNotes: () => api.post('/health-activities/reindex'),
  getSummary: (params = {}) => api.get('/health-activities/summary', { params }),
  get: (activityId) => api.get(`/health-activities/${activityId}`),
  create: (data) => api.post('/health-activities', data),
  update: (activityId, data) => api.patch(`/health-activities/${activityId}`, data),
  remove: (activityId) => api.delete(`/health-activities/${activityId}`),
  // Relleno asistido del formulario. Devuelve una propuesta y no escribe nada:
  // guardar sigue pasando por `create`, que recalcula todo lo que es del
  // servidor sin importar como nacio el borrador. 404 con el flag apagado.
  aiDraft: (data) => api.post('/health-activities/ai-draft', data),
};

// Personal health library. Foods and exercises are individual autocomplete
// entries; templates are explicit snapshots of a complete meal or workout.
// Applying a template creates a new canonical HealthActivity server-side so
// derived totals/volume/pace are never calculated by the browser.
const healthLibraryCrud = (resource) => ({
  getAll: (params = {}) => api.get(`/health-library/${resource}`, { params }),
  create: (data) => api.post(`/health-library/${resource}`, data),
  update: (id, data) => api.patch(`/health-library/${resource}/${id}`, data),
  remove: (id) => api.delete(`/health-library/${resource}/${id}`),
});

export const healthLibraryApi = {
  foods: healthLibraryCrud('foods'),
  exercises: healthLibraryCrud('exercises'),
  templates: {
    ...healthLibraryCrud('templates'),
    apply: (id, data) => api.post(`/health-library/templates/${id}/apply`, data),
  },
};

// Health notes API — what the Mentor de Salud has retained from conversation,
// never the transcript itself. No POST: a note is born from the classifier,
// the person can only correct (`update`) or remove (`remove`) it.
export const healthNotesApi = {
  getAll: (params = {}) => agentApiInstance.get('/agent/health-chat/notes', { params }),
  update: (noteId, content) =>
    agentApiInstance.patch(`/agent/health-chat/notes/${noteId}`, { content }),
  remove: (noteId) => agentApiInstance.delete(`/agent/health-chat/notes/${noteId}`),
  // Deletes every note at once, each purged from the health index too — the
  // memory-side twin of resetting the conversation's context.
  resetAll: () => agentApiInstance.post('/agent/health-chat/notes/reset'),
};

// Projects API — planificaciones (item_type="project") con sus tasks/routines hijas.
// list/get devuelven el project + children + metrics agregadas (ver backend/routes/projects.py).
export const projectsApi = {
  getAll: (params = {}) => api.get('/projects', { params }),
  get: (projectId) => api.get(`/projects/${projectId}`),
  complete: (projectId) => api.post(`/projects/${projectId}/complete`),
  remove: (projectId) => api.delete(`/projects/${projectId}`),
};

// Reasoning API (Informe Razonado) — usa /reasoning-api/v1 (Traefik stripea /reasoning-api)
const reasoningApiInstance = axios.create({
  baseURL: `${API_URL}/reasoning-api/v1`,
});

reasoningApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

reasoningApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(normalizeQuotaError(error));
  }
);

export const reasoningApi = {
  generateReport: (daysBack = 14) => reasoningApiInstance.post('/reasoning/report', { days_back: daysBack }),
  getReportJob: (jobId) => reasoningApiInstance.get(`/reasoning/report-jobs/${jobId}`),
  getReports: () => reasoningApiInstance.get('/reasoning/reports'),
  getReport: (reportId) => reasoningApiInstance.get(`/reasoning/reports/${reportId}`),
  chat: (message, sessionId, reportId, intent) =>
    reasoningApiInstance.post('/reasoning/chat', {
      message,
      session_id: sessionId,
      report_id: reportId,
      intent,
    }),

  // ── NRRM ──────────────────────────────────────────────────────────────────
  // All of these 404 while the feature flags are off, which is the intended
  // "not available" signal — callers treat it as "hide the surface", not as
  // an error worth showing the user.
  generateCompanion: (reportId) =>
    reasoningApiInstance.post(`/reasoning/reports/${reportId}/companion`),
  getCompanion: (reportId) =>
    reasoningApiInstance.get(`/reasoning/reports/${reportId}/companion`),
  adoptAlternativeResponse: (reportId) =>
    reasoningApiInstance.post(
      `/reasoning/reports/${reportId}/companion/alternative-response/adopt`,
    ),

  // `targetText` must be the literal wording shown on screen: the suppression
  // key is derived from those words, so a paraphrase would silently key to
  // something else. `verdict: null` undoes previous feedback.
  sendFeedback: (reportId, { targetType, targetText = '', stage = '', verdict, userCorrection = null, evidenceIds = [] }) =>
    reasoningApiInstance.post(`/reasoning/reports/${reportId}/feedback`, {
      target_type: targetType,
      target_text: targetText,
      stage,
      verdict,
      user_correction: userCorrection,
      evidence_ids: evidenceIds,
    }),
  getFeedback: (reportId) =>
    reasoningApiInstance.get(`/reasoning/reports/${reportId}/feedback`),
  sendResourceFeedback: (reportId, resourceId, resourceFeedback) =>
    reasoningApiInstance.post(`/reasoning/reports/${reportId}/feedback/resource`, {
      resource_id: resourceId,
      resource_feedback: resourceFeedback,
    }),
};

// Health goal — one live goal per person, on the backend and not in
// reasoning-service. `get` answers `null` when nothing is declared: the product
// records a direction, it never proposes one.
export const healthGoalApi = {
  get: () => api.get('/health-goal'),
  set: (payload) => api.put('/health-goal', payload),
  clear: () => api.delete('/health-goal'),
};

// Health Report API (Informe Razonado de Salud) — own endpoints, own job
// store, own history. Never a section of reasoningApi's general report: the
// two never share a row, a query or a response (see health_report_store.py).
export const healthReportApi = {
  generateReport: (daysBack = 14) =>
    reasoningApiInstance.post('/reasoning/health-report', { days_back: daysBack }),
  getReportJob: (jobId) => reasoningApiInstance.get(`/reasoning/health-report-jobs/${jobId}`),
  getReports: () => reasoningApiInstance.get('/reasoning/health-reports'),
  getPositiveSignals: (days = 30) =>
    reasoningApiInstance.get('/reasoning/health-positive-signals', { params: { days } }),
  getReport: (reportId) => reasoningApiInstance.get(`/reasoning/health-reports/${reportId}`),
  askQuestion: (reportId, data) =>
    reasoningApiInstance.post(`/reasoning/health-reports/${reportId}/chat`, data),
  getCompanion: (reportId) =>
    reasoningApiInstance.get(`/reasoning/health-reports/${reportId}/companion`),
  generateCompanion: (reportId) =>
    reasoningApiInstance.post(`/reasoning/health-reports/${reportId}/companion`),
  adoptAction: (reportId, actionId) =>
    reasoningApiInstance.post(
      `/reasoning/health-reports/${reportId}/actions/${encodeURIComponent(actionId)}/adopt`
    ),
  // Se envian el informe y la relacion, y ninguna redaccion. El texto de la
  // nota lo compone el servidor desde la relacion inmutable que guardo: dejar
  // que el navegador mandase prosa convertiria el boton en una via de escritura
  // libre a la memoria del Mentor.
  adoptRelation: (reportId, relationId) =>
    reasoningApiInstance.post(
      `/reasoning/health-reports/${reportId}/relations/${encodeURIComponent(relationId)}/adopt`
    ),
};

// Seguimiento de objetivos de salud — supervisa el objetivo declarado, no el
// periodo entero. Colecciones, cuota e historial propios, igual que el informe:
// generar un seguimiento no gasta ni reutiliza un informe de salud.
export const healthFollowupApi = {
  generate: (daysBack = 14) =>
    reasoningApiInstance.post('/reasoning/health-goal-followup', { days_back: daysBack }),
  getJob: (jobId) => reasoningApiInstance.get(`/reasoning/health-goal-followup-jobs/${jobId}`),
  // El vigente y el job en vuelo en una sola llamada: la fuente de verdad de
  // «se está generando» es el servidor, no el almacenamiento del navegador.
  getCurrent: () => reasoningApiInstance.get('/reasoning/health-goal-followups/current'),
  list: () => reasoningApiInstance.get('/reasoning/health-goal-followups'),
  get: (followupId) => reasoningApiInstance.get(`/reasoning/health-goal-followups/${followupId}`),
};

export const healthPracticesApi = {
  list: (days = 90) => api.get('/health-practices', { params: { days } }),
  recordApplication: (practiceKey, data = {}) =>
    api.post(`/health-practices/${encodeURIComponent(practiceKey)}/applications`, data),
  setStatus: (practiceKey, status) =>
    api.patch(`/health-practices/${encodeURIComponent(practiceKey)}`, { status }),
};

// Fase 2 — plan y desbloqueos por actividad (backend, no reasoning-service).
export const meApi = {
  getPlan: () => api.get('/me/plan'),
  getEntitlements: () => api.get('/me/entitlements'),
  // Solo el desbloqueo de Mi centro por ahora (§2.6) — más barato que pedir
  // entitlements completo cuando lo único que hace falta es esto.
  getActivity: () => api.get('/me/activity'),
};

// "Mi centro" API (euler-application.md §12) — 404 while REASONING_CENTER_ENABLED
// is off, same "hide the surface" convention as the NRRM endpoints above.
export const centerApi = {
  getCenter: (config = {}) => reasoningApiInstance.get('/reasoning/center', config),
  generateCenter: () => reasoningApiInstance.post('/reasoning/center/generate'),
  // Replaces the whole center — wipes every panel's saved notes. The client
  // must confirm with the user before calling this (§12.2-bis).
  regenerateCenter: () => reasoningApiInstance.post('/reasoning/center/regenerate'),
  getCenterJob: (jobId) => reasoningApiInstance.get(`/reasoning/center/jobs/${jobId}`),
  patchPanel: (key, { userAnnotation, expectedRevision }) =>
    reasoningApiInstance.patch(`/reasoning/center/panels/${key}`, {
      user_annotation: userAnnotation,
      expected_revision: expectedRevision,
    }),
  regeneratePanel: (key, expectedRevision) =>
    reasoningApiInstance.post(`/reasoning/center/panels/${key}/regenerate`, {
      expected_revision: expectedRevision,
    }),
  // On-demand only (§11.3) — never persisted alongside evidence_refs.
  getEvidenceSnippet: (evidenceId) =>
    reasoningApiInstance.get(`/reasoning/center/evidence/${encodeURIComponent(evidenceId)}`),
};

export const behaviorsApi = {
  // Adopted behaviours live in backend (they outlive any single report).
  list: () => api.get('/stats/behaviors'),
  // NRRM F7.1/§8.6 — the user reporting one application. Everything except
  // trigger_category is optional, and none of it is ever inferred: nothing is
  // counted without the user saying so (I11).
  recordApplication: (responseKey, data) =>
    api.post(`/stats/behaviors/${encodeURIComponent(responseKey)}/applications`, data),
  // §8.5 — only the states the user owns. practicing/consolidating are derived
  // from applications and are not settable from here.
  setStatus: (responseKey, status) =>
    api.patch(`/stats/behaviors/${encodeURIComponent(responseKey)}`, { status }),
};

const getAgentInteractions = async (params = {}) => {
  const response = await agentApiInstance.get('/agent/interactions', {
    params: { limit: 500, skip: 0, ...params },
  });
  return { response, interactions: response.data?.interactions || [] };
};

const getHealthInteractions = async (params = {}) => {
  // prompt_profile is deliberately dropped: the health endpoint has no such
  // filter, and forwarding it would only look like it partitioned something.
  const { prompt_profile, ...rest } = params;
  const response = await agentApiInstance.get('/agent/health-chat/interactions', {
    params: { limit: 500, skip: 0, ...rest },
  });
  return { response, interactions: response.data?.interactions || [] };
};

// Conversations adapter — groups a flat interaction feed into conversations.
//
// Both mentors persist turns the same way (one row per turn, keyed by
// session_id); they only differ in which endpoint serves them. So the grouping
// lives here once and each surface supplies its own fetcher, rather than the
// health history growing a second copy of this logic that can drift.
const buildConversationsApi = (fetchInteractions) => ({
  getAll: async (params = {}) => {
    const { response, interactions } = await fetchInteractions(params);
    const conversations = {};

    interactions.forEach((item) => {
      const sessionId = item.session_id || 'sin-sesion';
      const timestamp = item.timestamp || new Date().toISOString();
      const current = conversations[sessionId] || {
        session_id: sessionId,
        last_message_at: timestamp,
        preview: '',
        message_count: 0,
      };

      current.message_count += item.agent_response ? 2 : 1;
      if (!current.preview || new Date(timestamp) >= new Date(current.last_message_at)) {
        current.last_message_at = timestamp;
        current.preview = item.user_message || item.agent_response || '';
      }
      conversations[sessionId] = current;
    });

    return {
      ...response,
      data: Object.values(conversations).sort(
        (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)
      ),
    };
  },
  getById: async (sessionId, params = {}) => {
    const { response, interactions } = await fetchInteractions(params);
    const messages = interactions
      .filter((item) => (item.session_id || 'sin-sesion') === sessionId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .flatMap((item) => [
        item.user_message && {
          role: 'user',
          message: item.user_message,
          timestamp: item.timestamp,
          friction: item.observer_output?.primary_friction,
          patternEligible: item.observer_output?.pattern_eligible === true,
          mode: item.selected_mode,
        },
        item.agent_response && {
          role: 'assistant',
          message: item.agent_response,
          timestamp: item.timestamp,
          friction: item.observer_output?.primary_friction,
          patternEligible: item.observer_output?.pattern_eligible === true,
          mode: item.selected_mode,
          taskKind: item.ui_action?.data?.task_kind,
        },
      ].filter(Boolean));

    return { ...response, data: { session_id: sessionId, messages } };
  },
});

export const conversationsApi = buildConversationsApi(getAgentInteractions);

// Health history: same shape, different endpoint, and no prompt_profile — one
// thread per user rather than one per mentor voice.
export const healthConversationsApi = buildConversationsApi(getHealthInteractions);

// Profile API
export const profileApi = {
  getTemplate: () => api.get('/profile/template'),
  getProfile: () => api.get('/profile'),
  getMissionLenses: () => api.get('/profile/mission-lenses'),
  saveProfile: (data) => api.post('/profile', data),
};

// User Settings API (prompt profile selection)
export const userSettingsApi = {
  getSettings: (config = {}) => api.get('/user/settings', config),
  saveSettings: (data) => api.patch('/user/settings', data),
};

// Separate from userSettingsApi.saveSettings on purpose: the backend PATCH for
// /user/settings deliberately ignores these two fields (a second write path
// would produce grants no revocation could match against). Revoking here also
// purges the health note index server-side, which a plain settings save never
// does — so this has to be its own endpoint, not a field in the same PATCH.
export const healthConsentApi = {
  // Sin `scope` responde por `health_note_recall`, que es lo que pedian todos
  // los clientes antes de que existieran los otros dos. Cambiar ese default
  // volveria a apuntar a otro sitio cada llamada sin versionar.
  getConsent: (config = {}) => api.get('/health-consent', config),
  getAllConsent: (config = {}) => api.get('/health-consent/all', config),
  setConsent: (granted, scope) =>
    api.post('/health-consent', scope ? { granted, scope } : { granted }),
};

export default api;
