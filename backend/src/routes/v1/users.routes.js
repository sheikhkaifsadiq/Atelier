import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { me, credits } from "../../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, me);
router.get("/me/credits", authenticate, credits);

export default router;
