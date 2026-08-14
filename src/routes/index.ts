import express, { Application, Request, Response } from "express";
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

  // Tolerancia a URLs mal compuestas por plantillas de WhatsApp.
  // Un boton de URL dinamica concatena base + variable; si la variable trae la
  // URL completa queda /e/https:/dominio/e/<slug>. En vez de 404, se rescata el
  // ultimo segmento que parezca un slug nuestro y se redirige al link bueno.
  // Los mensajes ya enviados con el link roto empiezan a funcionar sin reenviar.
  app.get(/^\/([er])\/.+/, (req: Request, res: Response) => {
    const kind = req.path.startsWith("/e/") ? "e" : "r";
    const slug = req.path
      .split("/")
      .filter(Boolean)
      .reverse()
      .find((seg) => /^[a-z0-9]{6,24}$/.test(seg));

    if (slug) {
      res.redirect(301, `/${kind}/${slug}`);
      return;
    }
    // Sin slug rescatable: que el handler normal muestre su 404 con marca
    if (kind === "e") return renderPublicStudy(req, res);
    return renderPublicReport(req, res);
  });
}

export default routerApi;
