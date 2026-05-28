import express, { Application } from "express";
import authRouter from "./auth.routes";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/auth", authRouter);
}

export default routerApi;
