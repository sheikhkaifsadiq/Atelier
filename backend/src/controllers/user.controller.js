import { pool } from "../config/db.js";
import { getCredits } from "../services/billing.service.js";
import { env } from "../config/env.js";

export const me = async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.credits,
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.userId]
    );
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    const u = r.rows[0];
    res.json({ user: { ...u, credits: Number(u.credits) } });
  } catch (err) { next(err); }
};

export const credits = async (req, res, next) => {
  try {
    const balance = await getCredits(req.user.userId);
    res.json({ credits: balance, costs: env.credits.costs });
  } catch (err) { next(err); }
};
