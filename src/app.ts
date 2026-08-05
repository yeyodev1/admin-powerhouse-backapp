import express from "express";
import cors from "cors";
import http from "http";
import routerApi from "./routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.middleware";

const whitelist = [
  "http://localhost:8100",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8101",
  "https://admin-powerhouse.netlify.app",
  "https://testing-storybrand-frontend.bakano.ec",
  "http://testing-storybrand-frontend.bakano.ec"
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, "");
    const baseOrigin = cleanOrigin.split("/").slice(0, 3).join("/");
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, "") : "";

    if (
      whitelist.includes(cleanOrigin) ||
      whitelist.includes(baseOrigin) ||
      (frontendUrl && (cleanOrigin === frontendUrl || baseOrigin === frontendUrl)) ||
      cleanOrigin.endsWith(".bakano.ec") ||
      baseOrigin.endsWith(".bakano.ec") ||
      cleanOrigin.endsWith(".vercel.app") ||
      baseOrigin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));

  app.use(async (req, res, next) => {
    try {
      const { dbConnect } = await import("./config/mongo");
      await dbConnect();
      next();
    } catch (error) {
      console.error("Database connection failed in middleware:", error);
      next(error);
    }
  });

  app.get("/", (_req, res) => {
    res.send("Server is alive");
  });

  routerApi(app);

  app.use(globalErrorHandler);

  const server = http.createServer(app);

  return { app, server };
}
