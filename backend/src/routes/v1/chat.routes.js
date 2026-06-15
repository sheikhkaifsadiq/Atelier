import express from "express";
import multer from "multer";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";
import { requireCredits } from "../../middlewares/credits.middleware.js";
import { sendMessage, sendAudio, sendImage } from "../../controllers/chat.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 20 * 1024 * 1024 } });
const allowRoles = authorizeRoles("user", "admin");

router.post("/text", authenticate, allowRoles, requireCredits("text"), sendMessage);
router.post(
  "/audio",
  authenticate,
  allowRoles,
  upload.single("file"),
  requireCredits("audio"),
  sendAudio
);
router.post(
  "/image",
  authenticate,
  allowRoles,
  upload.single("file"),
  requireCredits("image"),
  sendImage
);

export default router;
