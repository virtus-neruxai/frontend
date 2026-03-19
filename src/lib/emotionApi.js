import axios from 'axios';

const EMOTION_API_URL =
  process.env.REACT_APP_EMOTION_BACKEND_URL ||
  (process.env.REACT_APP_BACKEND_URL
    ? `${process.env.REACT_APP_BACKEND_URL}/emotion-api`
    : `${window.location.origin}/emotion-api`);

const emotionApi = axios.create({
  baseURL: `${EMOTION_API_URL}/v1`,
});

emotionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

emotionApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const emotionsApi = {
  create: (data) => emotionApi.post('/emotions', data),
  getRange: (params = {}) => emotionApi.get('/emotions', { params }),
  getDay: (date) => emotionApi.get(`/emotions/day/${date}`),
  getRecent: (limit = 3) => emotionApi.get('/emotions/recent', { params: { limit } }),
  update: (id, data) => emotionApi.patch(`/emotions/${id}`, data),
  delete: (id) => emotionApi.delete(`/emotions/${id}`),
};

export default emotionApi;
