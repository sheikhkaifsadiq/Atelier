import api from "./api";

export const sendFeedback = async (pipelineId, score) =>
  (await api.post("/feedback", { pipelineId, score })).data;
