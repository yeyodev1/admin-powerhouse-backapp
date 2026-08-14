import crypto from "crypto";
import axios from "axios";
import { Study, IStudy } from "../models/study.model";
import { Assessment, IAssessment } from "../models/assessment.model";
import { CustomError } from "../errors/customError.error";
import { STUDY_SYSTEM_PROMPT, buildStudyUserPrompt } from "./studyPrompt";

const STUDY_MODEL = process.env.STUDY_AI_MODEL || "claude-sonnet-4-6";

/** Webhook de GHL que entrega el estudio por WhatsApp */
const GHL_STUDY_WEBHOOK =
  process.env.GHL_STUDY_WEBHOOK ||
  process.env.GHL_ASSESSMENT_WEBHOOK ||
  "https://services.leadconnectorhq.com/hooks/P62nq2IVqxaQbOrD3P1R/webhook-trigger/S99es9hXTIfKesdWrKBW";

function publicBaseUrl(): string {
  const raw =
    process.env.PUBLIC_REPORT_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://app-powerhouse-backapp.vercel.app";
  return raw.replace(/\/+$/, "");
}

export function buildStudyUrl(publicId: string): string {
  return `${publicBaseUrl()}/e/${publicId}`;
}

function generatePublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let id = "";
  for (let i = 0; i < bytes.length; i++) id += alphabet[bytes[i]! % alphabet.length];
  return id;
}

// ─── Cola ──────────────────────────────────────────────────────────────────────

/**
 * Encola un estudio. NO lo genera: en Vercel la función se congela al responder,
 * así que una promesa suelta no sobreviviría. La generación la hace `runQueue`,
 * disparado por `kickQueue` (invocación HTTP aparte) o por el panel.
 */
export async function enqueueStudy(assessment: IAssessment): Promise<IStudy> {
  const previous = await Study.countDocuments({ assessment: assessment._id });

  const study = await Study.create({
    publicId: generatePublicId(),
    version: previous + 1,
    assessment: assessment._id,
    assessmentPublicId: assessment.publicId,
    nombre: assessment.nombre,
    fullName: assessment.fullName || `${assessment.nombre} ${assessment.apellido}`.trim(),
    email: assessment.email,
    telefono: assessment.telefono,
    status: "queued",
    stage: "En cola",
    progress: 5,
    aiModel: STUDY_MODEL,
  });

  console.log(`[study] encolado ${study.publicId} v${study.version} (${assessment.email})`);
  return study;
}

/**
 * Despierta al procesador con un fetch al propio servidor. Fire-and-forget:
 * arranca una invocación nueva que sí tiene su propio ciclo de vida.
 */
export function kickQueue(): void {
  const url = `${publicBaseUrl()}/api/studies/run-queue`;
  axios
    .post(url, {}, { headers: { "x-queue-token": process.env.QUEUE_TOKEN || "" }, timeout: 2000 })
    .catch(() => {
      /* si no despierta, el panel puede correr la cola manualmente */
    });
}

async function callClaude(assessment: IAssessment): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new CustomError("ANTHROPIC_API_KEY no está configurada", 500);

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: STUDY_MODEL,
      max_tokens: 8000,
      system: STUDY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildStudyUserPrompt(assessment) }],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      timeout: 300000,
    }
  );

  const text = response.data?.content?.[0]?.text;
  if (!text) throw new CustomError("El modelo no devolvió contenido", 502);
  return text;
}

/** Genera un estudio concreto. Actualiza `stage` para que el panel lo muestre. */
export async function runStudy(studyId: string): Promise<IStudy | null> {
  const study = await Study.findById(studyId);
  if (!study || study.status === "ready" || study.status === "generating") return study;

  const startedAt = Date.now();
  study.status = "generating";
  study.startedAt = new Date();
  study.stage = "Leyendo respuestas del cuestionario";
  study.progress = 20;
  await study.save();

  try {
    const assessment = await Assessment.findById(study.assessment);
    if (!assessment) throw new CustomError("El cuestionario ya no existe", 404);

    study.stage = "Analizando los 12 sistemas";
    study.progress = 45;
    await study.save();

    const content = await callClaude(assessment);

    study.content = content;
    study.status = "ready";
    study.stage = "Listo";
    study.progress = 100;
    study.finishedAt = new Date();
    study.durationMs = Date.now() - startedAt;
    await study.save();

    console.log(`[study] listo ${study.publicId} en ${study.durationMs}ms`);
    return study;
  } catch (error: any) {
    study.status = "failed";
    study.stage = "Falló la generación";
    study.error = error?.message || "Error desconocido";
    study.finishedAt = new Date();
    await study.save();
    console.error(`[study] falló ${study.publicId}:`, study.error);
    return study;
  }
}

/** Procesa la cola. `limit` evita agotar el tiempo de la función serverless. */
export async function runQueue(limit = 2) {
  const pending = await Study.find({ status: "queued" }).sort({ queuedAt: 1 }).limit(limit);
  const results = [];
  for (const study of pending) {
    results.push(await runStudy(String(study._id)));
  }
  return {
    processed: results.length,
    remaining: await Study.countDocuments({ status: "queued" }),
  };
}

// ─── Consulta y edición ────────────────────────────────────────────────────────

export async function getStudy(publicId: string) {
  const study = await Study.findOne({ publicId });
  if (!study) throw new CustomError("Estudio no encontrado", 404);
  return study;
}

export async function listStudies(query?: { status?: string; email?: string }) {
  const mongoQuery: Record<string, unknown> = {};
  if (query?.status) mongoQuery.status = query.status;
  if (query?.email) mongoQuery.email = query.email.toLowerCase();
  return Study.find(mongoQuery)
    .select("-content -editedContent")
    .sort({ createdAt: -1 })
    .limit(200);
}

/** El texto editado nunca pisa `content`: queda la trazabilidad de lo que dio la IA */
export async function updateStudyContent(publicId: string, content: string, editedBy?: string) {
  const study = await getStudy(publicId);
  if (typeof content !== "string" || !content.trim()) {
    throw new CustomError("El contenido no puede quedar vacío", 400);
  }
  study.editedContent = content;
  study.edited = true;
  study.editedAt = new Date();
  study.editedBy = editedBy || "admin";
  await study.save();
  return study;
}

export function studyFinalContent(study: IStudy): string {
  return study.editedContent?.trim() ? study.editedContent : study.content;
}

// ─── Entrega por WhatsApp ──────────────────────────────────────────────────────

/**
 * Dispara el webhook de GHL con el link del estudio. GHL es quien manda el
 * WhatsApp con su plantilla; aquí solo se entrega la variable `estudio_url`.
 */
export async function sendStudyToWhatsapp(publicId: string) {
  const study = await getStudy(publicId);

  if (study.status !== "ready") {
    throw new CustomError("El estudio todavía no está listo", 400);
  }
  if (!study.telefono) {
    throw new CustomError("El contacto no tiene teléfono registrado", 400);
  }

  const url = buildStudyUrl(study.publicId);
  const payload = {
    nombre: study.nombre,
    nombre_completo: study.fullName,
    email: study.email,
    telefono: study.telefono,
    paso: "estudio_phb_listo",
    evento: "envio_estudio_whatsapp",

    // URL completa: sirve para plantillas con boton de URL estatica
    estudio_url: url,
    // Solo el identificador: es lo que va en un boton de URL DINAMICA de
    // WhatsApp, donde la plantilla guarda la base y {{1}} es el sufijo.
    estudio_slug: study.publicId,
    estudio_id: study.publicId,
    estudio_version: study.version,

    reporte_url: `${publicBaseUrl()}/r/${study.assessmentPublicId}`,
    reporte_slug: study.assessmentPublicId,
    editado: study.edited,
  };

  let ok = false;
  let detail = "";

  try {
    const response = await axios.post(GHL_STUDY_WEBHOOK, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    ok = true;
    detail = `ok:${response.status}`;
  } catch (error: any) {
    detail = `error:${error?.response?.status || error?.code || "unknown"}`;
  }

  study.deliveries.push({
    channel: "whatsapp",
    to: study.telefono,
    sentAt: new Date(),
    ok,
    detail,
  });
  await study.save();

  if (!ok) throw new CustomError(`No se pudo entregar al CRM (${detail})`, 502);
  return { sent: true, url, detail, deliveries: study.deliveries.length };
}
