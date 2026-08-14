import express, { Application } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import personRouter from "./person.routes";
import ghlRouter from "./ghl.routes";
import assessmentRouter from "./assessment.routes";
import studyRouter from "./study.routes";
import { renderPublicReport } from "../controllers/assessment.controller";
import { renderPublicStudy } from "../controllers/study.controller";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/auth", authRouter);
  router.use("/", userRouter);
  router.use("/", personRouter);
  router.use("/ghl", ghlRouter);
  router.use("/", assessmentRouter);
  router.use("/", studyRouter);

  // Links publicos: viven fuera de /api a proposito, se comparten por WhatsApp.
  // `/r` es el reporte del cuestionario, `/e` el estudio generado por IA.
  app.get("/r/:publicId", renderPublicReport);
  app.get("/e/:publicId", renderPublicStudy);
}

export default routerApi;
