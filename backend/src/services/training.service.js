import { pool } from "../config/db.js";
import { MODEL_VERSION } from "./ai.service.js";

/**
 * Fire-and-forget RLHF logger. Never blocks the user response.
 * Returns the new pipeline row id (or null on failure).
 */
export const logInteraction = async ({
  userId,
  sessionId,
  prompt,
  response,
  mediaType = "text",
}) => {
  try {
    const r = await pool.query(
      `INSERT INTO training_data_pipeline
         (user_id, session_id, prompt, response, model, media_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, sessionId, prompt, response, MODEL_VERSION, mediaType]
    );
    return r.rows[0].id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[training] log failed:", err.message);
    return null;
  }
};

export const scoreInteraction = async (pipelineId, userId, score) => {
  const r = await pool.query(
    `UPDATE training_data_pipeline
     SET quality_score = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, quality_score`,
    [pipelineId, userId, score]
  );
  return r.rows[0] || null;
};
