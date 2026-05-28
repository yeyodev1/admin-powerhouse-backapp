import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { register, login } from "../controllers/auth.controller";
import { getMe } from "../controllers/user.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

export default router;