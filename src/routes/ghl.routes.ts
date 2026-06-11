import { Router } from "express";
import { getAgentMetrics } from "../controllers/ghl.controller";

const router = Router();

router.get("/metrics", getAgentMetrics);

export default router;
