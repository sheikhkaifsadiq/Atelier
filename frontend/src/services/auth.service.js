import api from "./api";

export const loginRequest = async (email, password) => {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
};

export const signupRequest = async (data) => {
  const res = await api.post("/auth/signup", data);
  return res.data;
};

export const googleLoginUrl = () =>
  `${api.defaults.baseURL.replace(/\/$/, "")}/auth/google`;
