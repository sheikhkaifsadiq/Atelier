import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("user", "admin"),
  (req, res) => {
    res.json({
      message: "User dashboard",
      user: req.user
    });
  }
);

export default router;
