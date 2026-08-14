import { Request, Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import {
  syncAssessment,
  getByPublicId,
  resendWebhook,
  listAssessments,
  buildWebhookPayload,
} from "../services/assessment.service";
import { renderReport, renderNotFound } from "../templates/report.template";

/** POST /api/assessments/sync — publico, lo llama el funnel en cada respuesta */
export async function sync(req: Request, res: Response) {
  const result = await syncAssessment(req.body);
  res.json(result);
}

/** GET /api/assessments/:publicId — publico, JSON del reporte */
export async function getOne(req: Request, res: Response) {
  const assessment = await getByPublicId(req.params.publicId as string);
  res.json({
    publicId: assessment.publicId,
    nombre: assessment.nombre,
    apellido: assessment.apellido,
    fullName: assessment.fullName,
    email: assessment.email,
    telefono: assessment.telefono,
    status: assessment.status,
    answeredCount: assessment.answeredCount,
    totalQuestions: assessment.totalQuestions,
    percent: assessment.percent,
    score: assessment.score,
    maxScore: assessment.maxScore,
    scorePercent: assessment.scorePercent,
    riskLevel: assessment.riskLevel,
    sectionScores: assessment.sectionScores,
    reportUrl: assessment.reportUrl,
    completedAt: assessment.completedAt,
    updatedAt: assessment.updatedAt,
    answers: Object.fromEntries(assessment.answers || new Map()),
    catalog: assessment.catalog,
  });
}

/** GET /api/assessments/:publicId/payload — util para depurar lo que ve el CRM */
export async function getPayload(req: Request, res: Response) {
  const assessment = await getByPublicId(req.params.publicId as string);
  res.json(buildWebhookPayload(assessment));
}

/** GET /api/assessments — listado para el panel */
export async function list(req: AuthRequest, res: Response) {
  const assessments = await listAssessments({
    status: req.query.status as string,
    search: req.query.search as string,
  });
  res.json(assessments);
}

/** POST /api/assessments/:publicId/resend-webhook — reintento manual al CRM */
export async function resend(req: AuthRequest, res: Response) {
  const result = await resendWebhook(req.params.publicId as string);
  res.json(result);
}

/** GET /r/:publicId — pagina publica del reporte (el link que viaja al CRM) */
export async function renderPublicReport(req: Request, res: Response) {
  try {
    const assessment = await getByPublicId(req.params.publicId as string);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=60");
    res.send(renderReport(assessment));
  } catch {
    res.status(404).set("Content-Type", "text/html; charset=utf-8").send(renderNotFound());
  }
}
