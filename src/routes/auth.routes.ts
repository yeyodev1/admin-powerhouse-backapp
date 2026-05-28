import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { register, login } from "../controllers/auth.controller";
import { getMe } from "../controllers/user.controller";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authMiddleware, getMe);

export default router;