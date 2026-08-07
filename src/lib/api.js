import axios from 'axios';

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
    return Promise.reject(error);
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
    return Promise.reject(error);
  }
);

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
    return Promise.reject(error);
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

// Conversations API — compatibility adapter over agent-service interactions.
export const conversationsApi = {
  getAll: async (params = {}) => {
    const { response, interactions } = await getAgentInteractions(params);
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
    const { response, interactions } = await getAgentInteractions(params);
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
        },
      ].filter(Boolean));

    return { ...response, data: { session_id: sessionId, messages } };
  },
};

// Profile API
export const profileApi = {
  getTemplate: () => api.get('/profile/template'),
  getProfile: () => api.get('/profile'),
  getMissionLenses: () => api.get('/profile/mission-lenses'),
  saveProfile: (data) => api.post('/profile', data),
};

// User Settings API (prompt profile selection)
export const userSettingsApi = {
  getSettings: () => api.get('/user/settings'),
  saveSettings: (data) => api.patch('/user/settings', data),
};

export default api;
