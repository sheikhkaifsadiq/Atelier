import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Hook other modules can subscribe to for global 402 handling.
const listeners = new Set();
export const on402 = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 402) {
      listeners.forEach((fn) => fn(err.response.data));
    }
    return Promise.reject(err);
  }
);

export default api;
