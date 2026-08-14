import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { staffMiddleware } from "../middlewares/staff.middleware";
import {
  createForAssessment,
  list,
  getOne,
  update,
  sendWhatsapp,
  processQueue,
} from "../controllers/study.controller";

const router = Router();

// Procesador de la cola: se auto-invoca, valida por token propio
router.post("/studies/run-queue", processQueue);

// Panel: administradores y asesores
router.get("/studies", authMiddleware, staffMiddleware, list);
router.get("/studies/:publicId", authMiddleware, staffMiddleware, getOne);
router.patch("/studies/:publicId", authMiddleware, staffMiddleware, update);
router.post("/studies/:publicId/send-whatsapp", authMiddleware, staffMiddleware, sendWhatsapp);
router.post("/assessments/:publicId/study", authMiddleware, staffMiddleware, createForAssessment);

export default router;
