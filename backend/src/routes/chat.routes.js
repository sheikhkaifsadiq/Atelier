import express from "express";
import multer from "multer";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { sendMessage, sendAudio, sendImage } from "../controllers/chat.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/text", authenticate, authorizeRoles("user", "admin"), sendMessage);
router.post("/audio", authenticate, authorizeRoles("user", "admin"), upload.single("file"), sendAudio);
router.post("/image", authenticate, authorizeRoles("user", "admin"), upload.single("file"), sendImage);

export default router;
