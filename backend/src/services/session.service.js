import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* ----------- Sessions ----------- */

export const createSession = async (userId, title = "New chat") => {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO chat_sessions (id, user_id, title)
     VALUES ($1, $2, $3)`,
    [id, userId, title]
  );
  return { id, title, user_id: userId, created_at: new Date(), updated_at: new Date() };
};

export const listSessions = async (userId) => {
  const result = await pool.query(
    `SELECT id, title, created_at, updated_at
     FROM chat_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 200`,
    [userId]
  );
  return result.rows;
};

export const getSession = async (sessionId, userId) => {
  const result = await pool.query(
    `SELECT id, title, user_id, created_at, updated_at
     FROM chat_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
};

export const renameSession = async (sessionId, userId, title) => {
  const result = await pool.query(
    `UPDATE chat_sessions
     SET title = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, updated_at`,
    [sessionId, userId, title]
  );
  return result.rows[0] || null;
};

export const deleteSession = async (sessionId, userId) => {
  const result = await pool.query(
    `DELETE FROM chat_sessions
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [sessionId, userId]
  );
  return result.rowCount > 0;
};

export const touchSession = async (sessionId) => {
  await pool.query(
    `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
    [sessionId]
  );
};

/* ----------- Messages ----------- */

export const listMessages = async (sessionId) => {
  const result = await pool.query(
    `SELECT id, sender, content, media_type, created_at
     FROM messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
};

export const recentMessages = async (sessionId, limit = 10) => {
  const result = await pool.query(
    `SELECT sender, content
     FROM (
       SELECT sender, content, created_at
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) t
     ORDER BY created_at ASC`,
    [sessionId, limit]
  );
  return result.rows;
};

export const saveMessage = async (sessionId, sender, content, mediaType = "text") => {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO messages (id, session_id, sender, content, media_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, sessionId, sender, content, mediaType]
  );
  await touchSession(sessionId);
  return id;
};
