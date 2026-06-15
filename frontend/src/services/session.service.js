import api from "./api";

export const listSessions = async () => (await api.get("/sessions")).data.sessions;
export const createSession = async (title) =>
  (await api.post("/sessions", { title })).data.session;
export const getSessionMessages = async (id) =>
  (await api.get(`/sessions/${id}/messages`)).data;
export const renameSession = async (id, title) =>
  (await api.patch(`/sessions/${id}`, { title })).data.session;
export const deleteSession = async (id) =>
  (await api.delete(`/sessions/${id}`)).data;
