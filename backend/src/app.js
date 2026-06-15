import express from "express";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";

import { errorHandler } from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";

import v1Routes from "./routes/v1/index.js";

// Legacy v0 (kept for back-compat)
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import moderatorRoutes from "./routes/moderator.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(passport.initialize());

// ---- Versioned API ----
app.use("/api/v1", v1Routes);

// ---- Legacy aliases (unversioned) ----
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

app.use(errorHandler);

export default app;
