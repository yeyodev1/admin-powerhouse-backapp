import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { ghlService } from "../services/ghl.service";

export const getAgentMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, agentId } = req.query;
    const result = await ghlService.getAgentMetrics(
      startDate as string, 
      endDate as string,
      agentId as string
    );
    
    return res.status(HttpStatusCode.Ok).send({
      message: "Agent metrics retrieved successfully.",
      metrics: result.data
    });
  } catch (error) {
    console.error("Error in getAgentMetrics:", error);
    return res.status(HttpStatusCode.InternalServerError).send({
      message: "Error retrieving agent metrics",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
