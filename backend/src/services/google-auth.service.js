import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";
import {
  generateAccessToken,
  generateRefreshToken,
} from "./token.service.js";

let configured = false;

export const isGoogleConfigured = () =>
  Boolean(env.google.clientId && env.google.clientSecret);

const findOrCreateGoogleUser = async (profile) => {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;
  const displayName = profile.displayName || email;
  const avatar = profile.photos?.[0]?.value || null;

  // Match by google_id first, then by email
  let r = await pool.query(`SELECT * FROM users WHERE google_id = $1`, [googleId]);
  let user = r.rows[0];

  if (!user && email) {
    r = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    user = r.rows[0];
    if (user) {
      await pool.query(
        `UPDATE users SET google_id = $2, avatar_url = COALESCE(avatar_url, $3),
                          display_name = COALESCE(display_name, $4)
         WHERE id = $1`,
        [user.id, googleId, avatar, displayName]
      );
    }
  }

  if (!user) {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO users (id, email, username, google_id, avatar_url, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, email, email, googleId, avatar, displayName]
    );
    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = 'user'`);
    if (roleRes.rows[0]) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, roleRes.rows[0].id]
      );
    }
    r = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    user = r.rows[0];
  }

  // Attach roles
  const roles = await pool.query(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [user.id]
  );
  user.roles = roles.rows.map((x) => x.name);
  return user;
};

export const configureGoogleStrategy = () => {
  if (configured || !isGoogleConfigured()) return;
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_at, _rt, profile, done) => {
        try {
          const user = await findOrCreateGoogleUser(profile);
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
  configured = true;
};

export const issueTokensFor = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);
  return { accessToken, refreshToken };
};
