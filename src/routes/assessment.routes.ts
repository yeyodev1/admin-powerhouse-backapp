import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  sync,
  getOne,
  getPayload,
  list,
  resend,
} from "../controllers/assessment.controller";

const router = Router();

// Publicas: las consume el funnel anonimo y la pagina del reporte
router.post("/assessments/sync", sync);
router.get("/assessments/:publicId", getOne);
router.get("/assessments/:publicId/payload", getPayload);

// Privadas: panel administrativo
router.get("/assessments", authMiddleware, list);
router.post("/assessments/:publicId/resend-webhook", authMiddleware, resend);

export default router;
