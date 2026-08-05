import { Router } from "express";
import { getAgentMetrics, getConversationMessages } from "../controllers/ghl.controller";

const router = Router();

router.get("/metrics", getAgentMetrics);
router.get("/conversations/:id/messages", getConversationMessages);

export default router;
