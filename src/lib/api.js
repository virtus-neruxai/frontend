import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

// Task API
export const tasksApi = {
  getAll: (params = {}) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  patch: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id, params = {}) => api.delete(`/tasks/${id}`, { params }),
  retry: (id) => api.post(`/tasks/${id}/retry`),
  markRoutineToday: (id, data = {}) => api.post(`/tasks/${id}/routine-completions`, data),
};


export const routinesApi = {
  getDashboard: () => api.get('/routines/dashboard'),
};

// Stats API
export const statsApi = {
  getSummary: (params = {}) => api.get('/stats/summary', { params }),
  getTimeseries: (days = 30) => api.get('/stats/timeseries', { params: { days } }),
  getEvolution: (params = {}) => api.get('/stats/evolution', { params }),
};

// Events API
export const eventsApi = {
  getTaskEvents: (params = {}) => api.get('/events/tasks', { params }),
  getMissionEvents: (params = {}) => api.get('/events/missions', { params }),
};

// Character API
export const characterApi = {
  get: () => api.get('/character'),
  getStatsInfo: () => api.get('/character/stats-info'),
  getStatsHistory: (days = 30) => api.get('/character/stats-history', { params: { days } }),
};

// Missions API
export const missionsApi = {
  getAll: (params = {}) => api.get('/missions', { params }),
  generate: (data = {}) => api.post('/missions/generate', data),
  complete: (id, data) => api.post(`/missions/${id}/complete`, data),
  nightlyReview: () => api.post('/missions/nightly-review'),
  confirmMissions: (missions) => api.post('/missions/confirm', { missions }),
  schedule: (missionId, data) => api.post(`/missions/${missionId}/schedule`, data),
  remove: (missionId) => api.delete(`/missions/${missionId}`),
};

// Reflections API
export const reflectionsApi = {
  getAll: (date) => api.get('/reflections', { params: date ? { date } : {} }),
  getHistory: (limit = 100, date) => api.get('/reflections/history', { params: { limit, ...(date ? { date } : {}) } }),
  getStatsHistory: (days = 30) => api.get('/reflections/stats-history', { params: { days } }),
  create: (data) => api.post('/reflections', data),
};

// Conversations API
export const conversationsApi = {
  getAll: (params = {}) => api.get('/conversations', { params }),
  getById: (sessionId) => api.get(`/conversations/${sessionId}`),
  delete: (sessionId) => api.delete(`/conversations/${sessionId}`),
};

// Notifications API
export const notificationsApi = {
  getHistory: (params = {}) => api.get('/notifications/history', { params }),
  markRead: (data) => api.post('/notifications/read', data),
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
  chat: (message, sessionId) => agentApiInstance.post('/agent/chat', { 
    message,
    session_id: sessionId 
  }),
  confirmDraft: (data) => agentApiInstance.post('/agent/draft/confirm', data),
};

// Graph Query API (usa /graph-query-api/v1 - Traefik stripea /graph-query-api)
const graphQueryApiInstance = axios.create({
  baseURL: `${API_URL}/graph-query-api/v1`,
});

graphQueryApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

graphQueryApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const graphAnalyticsApi = {
  getQuadrantDistribution: (daysBack = 30) =>
    graphQueryApiInstance.get('/analytics/quadrant-distribution', {
      params: { days_back: daysBack },
    }),
  getQuadrantEmotionCorrelation: (params = {}) =>
    graphQueryApiInstance.get('/analytics/quadrant-emotion-correlation', { params }),
  getBestSlot: (durationMinutes = 45) =>
    graphQueryApiInstance.get('/analytics/productive-free-slots', {
      params: { duration_minutes: durationMinutes, horizon_days: 7, top_n: 1 },
    }),
};

// Proactive Orchestrator API (usa /proactive-api - Traefik stripea /proactive-api)
const proactiveApiInstance = axios.create({
  baseURL: `${API_URL}/proactive-api/v1`,
});

proactiveApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

proactiveApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const proactiveApi = {
  list: (params = {}) => proactiveApiInstance.get('/suggestions', { params }),
  getById: (id) => proactiveApiInstance.get(`/suggestions/${id}`),
  confirm: (id, body = {}) => proactiveApiInstance.post(`/suggestions/${id}/confirm`, body),
  reject: (id) => proactiveApiInstance.post(`/suggestions/${id}/reject`),
  getMentorProfile: () => proactiveApiInstance.get('/mentor/profile'),
  getMentorDashboard: (params = {}) => proactiveApiInstance.get('/mentor/dashboard', { params }),
  getMentorEpisodes: (params = {}) => proactiveApiInstance.get('/mentor/episodes', { params }),
  patchMentorObjective: (objectiveKey, data) => proactiveApiInstance.patch(`/mentor/objectives/${objectiveKey}`, data),
  patchMentorItem: (itemKey, data) => proactiveApiInstance.patch(`/mentor/items/${itemKey}`, data),
};

// Project Manager API (usa /project-api/v1 - Traefik stripea /project-api)
const projectApiInstance = axios.create({
  baseURL: `${API_URL}/project-api/v1`,
});

projectApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

projectApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const projectApi = {
  getClientTimezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  chat: (message, sessionId) => projectApiInstance.post('/chat', {
    message,
    session_id: sessionId,
    client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  }),
  chatWithFile: (message, sessionId, file) => {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('session_id', sessionId);
    formData.append('file', file);
    formData.append('client_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    return projectApiInstance.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSessions: (params = {}) => projectApiInstance.get('/sessions', { params }),
  getSession: (sessionId) => projectApiInstance.get(`/sessions/${sessionId}`),
  deleteSession: (sessionId) => projectApiInstance.delete(`/sessions/${sessionId}`),
  getDraft: (draftId) => projectApiInstance.get(`/drafts/${draftId}`),
  confirmDraft: (draftId, projectData = null) =>
    projectApiInstance.post(`/drafts/${draftId}/confirm`, projectData ? { project_data: projectData } : {}),
  rejectDraft: (draftId) => projectApiInstance.post(`/drafts/${draftId}/reject`),
};

// Profile API
export const profileApi = {
  getTemplate: () => api.get('/profile/template'),
  getProfile: () => api.get('/profile'),
  saveProfile: (data) => api.post('/profile', data),
};

// User Settings API (prompt profile selection)
export const userSettingsApi = {
  getSettings: () => api.get('/user/settings'),
  saveSettings: (data) => api.patch('/user/settings', data),
};

export default api;
