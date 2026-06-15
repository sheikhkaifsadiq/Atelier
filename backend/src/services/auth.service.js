import { pool } from "../config/db.js";
import {
  hashPassword,
  comparePassword,
  upgradeLegacyHashIfNeeded,
} from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "./token.service.js";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";

export const registerUser = async ({ email, username, password }) => {
  if (!email || !password || !username) {
    throw new Error("email, username and password are required");
  }
  const hashed = await hashPassword(password);
  const userId = uuidv4();

  await pool.query(
    `INSERT INTO users (id, email, username, password_hash, credits)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, email, username, hashed, env.credits.defaultBalance]
  );

  const roleResult = await pool.query(
    `SELECT id FROM roles WHERE name = 'user'`
  );
  if (roleResult.rows[0]) {
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleResult.rows[0].id]
    );
  }

  return userId;
};

export const loginUser = async ({ email, password }) => {
  const result = await pool.query(
    `SELECT u.*, array_agg(r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email]
  );

  const user = result.rows[0];
  if (!user) throw new Error("Invalid credentials");

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new Error("Invalid credentials");

  // Silent upgrade from legacy unpeppered hash → peppered hash
  const upgraded = await upgradeLegacyHashIfNeeded(password, user.password_hash);
  if (upgraded) {
    await pool.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
      user.id,
      upgraded,
    ]);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken, user };
};
