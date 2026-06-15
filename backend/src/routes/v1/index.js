import express from "express";

import authRoutes from "./auth.routes.js";
import chatRoutes from "./chat.routes.js";
import userRoutes from "./users.routes.js";
import sessionRoutes from "./sessions.routes.js";
import feedbackRoutes from "./feedback.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true, version: "v1" }));

router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/users", userRoutes);
router.use("/sessions", sessionRoutes);
router.use("/feedback", feedbackRoutes);

export default router;
