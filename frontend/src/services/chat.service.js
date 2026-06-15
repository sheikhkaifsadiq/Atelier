import api from "./api";

export const sendText = async (message, sessionId) => {
  const res = await api.post("/chat/text", { message, sessionId });
  return res.data; // { sessionId, sessionTitle, reply, credits, pipelineId }
};

export const sendImage = async (file, sessionId, message) => {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("sessionId", sessionId);
  if (message) form.append("message", message);
  const res = await api.post("/chat/image", form);
  return res.data;
};

export const sendAudio = async (file, sessionId) => {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("sessionId", sessionId);
  const res = await api.post("/chat/audio", form);
  return res.data;
};
