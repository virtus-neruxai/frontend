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

// Task API — backed by /items?item_type=task
export const tasksApi = {
  getAll: (params = {}) => api.get('/items', { params: { ...params, item_type: 'task' } }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', { ...data, item_type: 'task' }),
  update: (id, data) => api.patch(`/items/${id}`, data),
  patch: (id, data) => api.patch(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  retry: (id) => api.patch(`/items/${id}`, { status: 'todo', is_complete: false }),
  markRoutineToday: (id, data = {}) => api.patch(`/items/${id}`, data),
};


// Stats API
export const statsApi = {
  getSummary: (params = {}) => api.get('/stats/summary', { params }),
  getTimeseries: (days = 30) => api.get('/stats/timeseries', { params: { days } }),
  getEvolution: (params = {}) => api.get('/stats/evolution', { params }),
};

// Character API
export const characterApi = {
  get: () => api.get('/character'),
  getStatsInfo: () => api.get('/character/stats-info'),
  getStatsHistory: (days = 30) => api.get('/character/stats-history', { params: { days } }),
};

// Missions API — backed by /items?item_type=mission
export const missionsApi = {
  getAll: (params = {}) => api.get('/items', { params: { ...params, item_type: 'mission' } }),
  generate: (data = {}) => api.post('/items/generate-with-context', data),
  complete: (id, data = {}) => api.patch(`/items/${id}`, {
    status: data.success === false ? 'failed' : 'done',
    is_complete: data.success !== false,
  }),
  nightlyReview: () => api.post('/items/nightly-review'),
  confirmMissions: (missions) => api.post('/items/confirm', { missions }),
  schedule: (missionId, data) => api.patch(`/items/${missionId}`, data),
  remove: (missionId) => api.delete(`/items/${missionId}`),
};

// Reflections API
export const reflectionsApi = {
  getAll: (date) => api.get('/reflections', { params: date ? { date } : {} }),
  getHistory: (limit = 100, date) => api.get('/reflections/history', { params: { limit, ...(date ? { date } : {}) } }),
  getStatsHistory: (days = 30) => api.get('/reflections/stats-history', { params: { days } }),
  create: (data) => api.post('/reflections', data),
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
          mode: item.selected_mode,
        },
        item.agent_response && {
          role: 'assistant',
          message: item.agent_response,
          timestamp: item.timestamp,
          friction: item.observer_output?.primary_friction,
          mode: item.selected_mode,
        },
      ].filter(Boolean));

    return { ...response, data: { session_id: sessionId, messages } };
  },
  delete: () => Promise.reject(new Error('Conversation deletion is not supported by the current agent API')),
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
