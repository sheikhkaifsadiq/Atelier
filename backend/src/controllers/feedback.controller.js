import { scoreInteraction } from "../services/training.service.js";

export const rate = async (req, res, next) => {
  try {
    const { pipelineId, score } = req.body;
    const s = Number(score);
    if (!pipelineId || ![1, -1].includes(s)) {
      return res.status(400).json({ message: "pipelineId and score (1|-1) required" });
    }
    const row = await scoreInteraction(pipelineId, req.user.userId, s);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true, pipelineId: row.id, score: row.quality_score });
  } catch (err) { next(err); }
};
