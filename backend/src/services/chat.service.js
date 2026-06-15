import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const createSession = async (userId) => {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO chat_sessions (id, user_id)
     VALUES ($1, $2)`,
    [id, userId]
  );
  return id;
};

export const saveMessage = async (sessionId, sender, content) => {
  await pool.query(
    `INSERT INTO messages (id, session_id, sender, content)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), sessionId, sender, content]
  );
};

export const getSessionMessages = async (sessionId) => {
  const result = await pool.query(
    `SELECT sender, content, created_at
     FROM messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
};
