import express, { Application } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import personRouter from "./person.routes";
import ghlRouter from "./ghl.routes";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/auth", authRouter);
  router.use("/", userRouter);
  router.use("/", personRouter);
  router.use("/ghl", ghlRouter);
}

export default routerApi;
