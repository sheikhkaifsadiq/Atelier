import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.get(
  "/panel",
  authenticate,
  authorizeRoles("moderator", "admin"),
  (req, res) => {
    res.json({
      message: "Moderator panel"
    });
  }
);

export default router;
