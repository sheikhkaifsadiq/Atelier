import express from "express";
import passport from "passport";
import { signup, login, refresh, logout } from "../../controllers/auth.controller.js";
import {
  configureGoogleStrategy,
  isGoogleConfigured,
  issueTokensFor,
} from "../../services/google-auth.service.js";
import { env } from "../../config/env.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

/* -------- Google OAuth -------- */
configureGoogleStrategy();

router.get("/google", (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({ message: "Google OAuth not configured" });
  }
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user) => {
      if (err || !user) {
        return res.redirect(
          `${env.frontendUrl}/auth/callback?error=google_failed`
        );
      }
      try {
        const { accessToken, refreshToken } = await issueTokensFor(user);
        const target = new URL(`${env.frontendUrl}/auth/callback`);
        target.searchParams.set("accessToken", accessToken);
        target.searchParams.set("refreshToken", refreshToken);
        res.redirect(target.toString());
      } catch (e) {
        next(e);
      }
    })(req, res, next);
  }
);

export default router;
