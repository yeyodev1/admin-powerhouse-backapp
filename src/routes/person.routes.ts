import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getAllPersons,
  getOnePerson,
  create,
  update,
  remove,
  uploadFile,
  deleteFile,
  analyzePerson,
  generateReport,
  saveAnalysis,
} from "../controllers/person.controller";

const router = Router();

router.get("/persons", getAllPersons);
router.post("/persons", authMiddleware, create);
router.get("/persons/:id", getOnePerson);
router.patch("/persons/:id", authMiddleware, update);
router.delete("/persons/:id", authMiddleware, remove);
router.post("/persons/:id/files", authMiddleware, uploadFile);
router.delete("/persons/:id/files/:fileId", authMiddleware, deleteFile);
router.post("/persons/:id/analyze", authMiddleware, analyzePerson);
router.post("/persons/:id/report", authMiddleware, generateReport);
router.post("/persons/:id/analyses", authMiddleware, saveAnalysis);
export default router;
