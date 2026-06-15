import dotenv from "dotenv";

dotenv.config();

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const env = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",

  passwordPepper: process.env.PASSWORD_PEPPER || "",

  geminiApiKey: process.env.GEMINI_API_KEY,

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.OAUTH_CALLBACK_URL ||
      "http://localhost:5000/api/v1/auth/google/callback",
  },

  credits: {
    defaultBalance: num(process.env.DEFAULT_USER_CREDITS, 100),
    costs: {
      text: num(process.env.CREDIT_COST_TEXT, 0.1),
      image: num(process.env.CREDIT_COST_IMAGE, 0.5),
      audio: num(process.env.CREDIT_COST_AUDIO, 0.3),
    },
  },
};
