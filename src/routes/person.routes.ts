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
} from "../controllers/person.controller";

const router = Router();

router.get("/persons", getAllPersons);
router.post("/persons", authMiddleware, create);
router.get("/persons/:id", getOnePerson);
router.patch("/persons/:id", authMiddleware, update);
router.delete("/persons/:id", authMiddleware, remove);
router.post("/persons/:id/files", authMiddleware, uploadFile);
router.delete("/persons/:id/files/:fileId", authMiddleware, deleteFile);

export default router;
