import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { rate } from "../../controllers/feedback.controller.js";

const router = express.Router();

router.post("/", authenticate, rate);

export default router;
