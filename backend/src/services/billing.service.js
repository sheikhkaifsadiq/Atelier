import { pool } from "../config/db.js";
import { env } from "../config/env.js";

export const costFor = (type) => env.credits.costs[type] ?? 0;

export const getCredits = async (userId) => {
  const r = await pool.query(`SELECT credits FROM users WHERE id = $1`, [userId]);
  return r.rows[0] ? Number(r.rows[0].credits) : 0;
};

/**
 * Atomically deduct credits. Returns the new balance, or null if insufficient.
 */
export const deductCredits = async (userId, amount) => {
  const r = await pool.query(
    `UPDATE users
     SET credits = credits - $2
     WHERE id = $1 AND credits >= $2
     RETURNING credits`,
    [userId, amount]
  );
  return r.rows[0] ? Number(r.rows[0].credits) : null;
};

export const addCredits = async (userId, amount) => {
  const r = await pool.query(
    `UPDATE users SET credits = credits + $2
     WHERE id = $1 RETURNING credits`,
    [userId, amount]
  );
  return r.rows[0] ? Number(r.rows[0].credits) : null;
};
