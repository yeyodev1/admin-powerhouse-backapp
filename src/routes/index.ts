import express, { Application } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import personRouter from "./person.routes";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/auth", authRouter);
  router.use("/", userRouter);
  router.use("/", personRouter);
}

export default routerApi;
