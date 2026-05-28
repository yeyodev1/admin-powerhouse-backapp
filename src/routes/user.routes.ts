import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller";

const router = Router();

router.get("/users", getUsers);
router.post("/users", authMiddleware, createUser);
router.patch("/users/:id", authMiddleware, updateUser);
router.delete("/users/:id", authMiddleware, deleteUser);

export default router;
