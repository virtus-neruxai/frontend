import axios from 'axios';

const ARENA_API_URL =
  process.env.REACT_APP_ARENA_BACKEND_URL ||
  (process.env.REACT_APP_BACKEND_URL
    ? `${process.env.REACT_APP_BACKEND_URL}/arena-api`
    : `${window.location.origin}/arena-api`);

const api = axios.create({
  baseURL: `${ARENA_API_URL}/v1`,
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

// Arena API
export const arenaApi = {
  // User arena info
  getMe: () => api.get('/arena/me'),
  
  // Room
  getRoom: (roomId) => api.get(`/arena/room/${roomId}`),
  
  // Missions
  getTodayMission: () => api.get('/arena/mission/today'),
  getMission: (missionId) => api.get(`/arena/mission/${missionId}`),
  getSubmissions: (missionId) => api.get(`/arena/mission/${missionId}/submissions`),
  getMissionResults: (missionId) => api.get(`/arena/mission/${missionId}/results`),
  
  // Submissions
  submitReflection: (missionId, data) => api.post(`/arena/mission/${missionId}/submission`, data),
  
  // Voting
  vote: (missionId, targetUserId) => api.post(`/arena/mission/${missionId}/vote`, { target_user_id: targetUserId }),
  
  // Reports
  reportSubmission: (submissionId, reason) => api.post('/arena/report', { submission_id: submissionId, reason }),
  
  // Admin/Jobs (for testing)
  createDailyMission: (options = {}) => api.post('/arena/admin/create-daily-mission', options),
  closeTodayMission: () => api.post('/arena/admin/close-today-mission'),
  getStatus: () => api.get('/arena/admin/status'),
  seedData: (numUsers = 5, league = 1) => api.post('/arena/admin/seed', { num_users: numUsers, league }),
  resetArena: () => api.delete('/arena/admin/reset'),
};

export default arenaApi;
