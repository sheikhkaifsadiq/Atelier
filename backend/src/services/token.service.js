import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      roles: user.roles
    },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );
};

export const generateRefreshToken = async (userId) => {
  const token = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, token, expiresAt]
  );

  return token;
};

export const verifyRefreshToken = async (token) => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token = $1 AND revoked = false AND expires_at > NOW()`,
    [token]
  );

  return result.rows[0];
};

export const revokeRefreshToken = async (token) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = true WHERE token = $1`,
    [token]
  );
};
