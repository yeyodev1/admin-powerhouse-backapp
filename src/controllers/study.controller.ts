import { Request, Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import {
  enqueueStudy,
  scheduleQueueRun,
  runQueue,
  getStudy,
  listStudies,
  updateStudyContent,
  sendStudyToWhatsapp,
  buildStudyUrl,
  studyFinalContent,
} from "../services/study.service";
import { getByPublicId } from "../services/assessment.service";
import { renderStudy, renderStudyNotFound } from "../templates/study.template";
import { CustomError } from "../errors/customError.error";

/** POST /api/assessments/:publicId/study — encola un estudio nuevo (acumula versión) */
export async function createForAssessment(req: AuthRequest, res: Response) {
  const assessment = await getByPublicId(req.params.publicId as string);
  const study = await enqueueStudy(assessment);
  scheduleQueueRun();
  res.status(201).json({
    publicId: study.publicId,
    version: study.version,
    status: study.status,
    url: buildStudyUrl(study.publicId),
  });
}

/** GET /api/studies — listado con estado, para el panel */
export async function list(req: AuthRequest, res: Response) {
  const studies = await listStudies({
    status: req.query.status as string,
    email: req.query.email as string,
  });
  res.json(
    studies.map((s) => ({
      publicId: s.publicId,
      version: s.version,
      assessmentPublicId: s.assessmentPublicId,
      fullName: s.fullName,
      email: s.email,
      telefono: s.telefono,
      status: s.status,
      stage: s.stage,
      progress: s.progress,
      edited: s.edited,
      error: s.error,
      deliveries: s.deliveries.length,
      lastDeliveryOk: s.deliveries.at(-1)?.ok ?? null,
      url: buildStudyUrl(s.publicId),
      createdAt: s.createdAt,
      finishedAt: s.finishedAt,
    }))
  );
}

/** GET /api/studies/:publicId — detalle con el contenido para editar */
export async function getOne(req: AuthRequest, res: Response) {
  const study = await getStudy(req.params.publicId as string);
  res.json({
    publicId: study.publicId,
    version: study.version,
    assessmentPublicId: study.assessmentPublicId,
    fullName: study.fullName,
    email: study.email,
    telefono: study.telefono,
    status: study.status,
    stage: study.stage,
    progress: study.progress,
    error: study.error,
    content: study.content,
    editedContent: study.editedContent || "",
    finalContent: studyFinalContent(study),
    edited: study.edited,
    editedAt: study.editedAt,
    editedBy: study.editedBy,
    aiModel: study.aiModel,
    durationMs: study.durationMs,
    deliveries: study.deliveries,
    url: buildStudyUrl(study.publicId),
    createdAt: study.createdAt,
    finishedAt: study.finishedAt,
  });
}

/** PATCH /api/studies/:publicId — guarda la edición del asesor */
export async function update(req: AuthRequest, res: Response) {
  const study = await updateStudyContent(
    req.params.publicId as string,
    req.body?.content,
    req.user?.email
  );
  res.json({
    publicId: study.publicId,
    edited: study.edited,
    editedAt: study.editedAt,
    editedBy: study.editedBy,
  });
}

/** POST /api/studies/:publicId/send-whatsapp — entrega el link al CRM */
export async function sendWhatsapp(req: AuthRequest, res: Response) {
  const result = await sendStudyToWhatsapp(req.params.publicId as string);
  res.json(result);
}

/**
 * POST /api/studies/run-queue — procesa la cola.
 * Lo llama `scheduleQueueRun` y también el panel. Si hay QUEUE_TOKEN configurado se
 * exige, salvo que la petición venga de un usuario del staff ya autenticado.
 */
export async function processQueue(req: Request, res: Response) {
  const expected = process.env.QUEUE_TOKEN;
  const provided = req.headers["x-queue-token"];
  const authHeader = req.headers.authorization;

  if (expected && provided !== expected && !authHeader?.startsWith("Bearer ")) {
    throw new CustomError("Token de cola inválido", 401);
  }

  const result = await runQueue(Number(req.body?.limit) || 2);
  res.json(result);
}

/** GET /e/:publicId — página pública del estudio (el link que va por WhatsApp) */
export async function renderPublicStudy(req: Request, res: Response) {
  try {
    const study = await getStudy(req.params.publicId as string);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store");
    res.send(renderStudy(study));
  } catch {
    res.status(404).set("Content-Type", "text/html; charset=utf-8").send(renderStudyNotFound());
  }
}
