import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { list, create, messages, rename, remove } from "../../controllers/session.controller.js";

const router = express.Router();

router.use(authenticate);
router.get("/", list);
router.post("/", create);
router.get("/:id/messages", messages);
router.patch("/:id", rename);
router.delete("/:id", remove);

export default router;
