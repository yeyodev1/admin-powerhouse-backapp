import crypto from "crypto";
import {
  Assessment,
  IAssessment,
  IAssessmentSectionCatalog,
  IAssessmentSectionScore,
} from "../models/assessment.model";
import { CustomError } from "../errors/customError.error";
import { fireCompletionWebhook, buildWebhookPayload, LEVEL_LABELS } from "./assessmentWebhook";

// Re-export para no romper a quien ya los importaba desde aqui
export { fireCompletionWebhook, buildWebhookPayload, LEVEL_LABELS, cleanStringForGhl, getQuestionGhlKey, buildSummaryText } from "./assessmentWebhook";

/** Valor maximo por pregunta en la escala PHB (0 = nunca ... 3 = persistente) */
const MAX_PER_QUESTION = 3;

function publicBaseUrl(): string {
  const raw =
    process.env.PUBLIC_REPORT_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://app-powerhouse-backapp.vercel.app";
  return raw.replace(/\/+$/, "");
}

export function buildReportUrl(publicId: string): string {
  return `${publicBaseUrl()}/r/${publicId}`;
}

function generatePublicId(): string {
  // 10 chars, alfabeto sin caracteres ambiguos: legible al dictarlo por telefono
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let id = "";
  for (let i = 0; i < bytes.length; i++) {
    id += alphabet[bytes[i]! % alphabet.length];
  }
  return id;
}

function levelFromPercent(percent: number): string {
  if (percent >= 75) return "prioritario";
  if (percent >= 50) return "alerta";
  if (percent >= 25) return "vigilancia";
  return "optimo";
}

interface ScoringResult {
  answeredCount: number;
  totalQuestions: number;
  percent: number;
  score: number;
  maxScore: number;
  scorePercent: number;
  riskLevel: string;
  sectionScores: IAssessmentSectionScore[];
}

export function scoreAssessment(
  catalog: IAssessmentSectionCatalog[],
  answers: Map<string, number>
): ScoringResult {
  const sectionScores: IAssessmentSectionScore[] = [];
  let answeredCount = 0;
  let totalQuestions = 0;
  let score = 0;
  let maxScore = 0;

  for (const section of catalog) {
    let sAnswered = 0;
    let sScore = 0;
    const sTotal = section.questions.length;
    const sMax = sTotal * MAX_PER_QUESTION;

    for (const question of section.questions) {
      const value = answers.get(String(question.id));
      if (typeof value === "number" && !Number.isNaN(value)) {
        sAnswered += 1;
        sScore += value;
      }
    }

    const sPercent = sMax > 0 ? Math.round((sScore / sMax) * 100) : 0;

    sectionScores.push({
      id: section.id,
      title: section.title,
      answered: sAnswered,
      total: sTotal,
      score: sScore,
      maxScore: sMax,
      percent: sPercent,
      level: sAnswered === 0 ? "sin_datos" : levelFromPercent(sPercent),
    });

    answeredCount += sAnswered;
    totalQuestions += sTotal;
    score += sScore;
    maxScore += sMax;
  }

  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    answeredCount,
    totalQuestions,
    percent,
    score,
    maxScore,
    scorePercent,
    riskLevel: answeredCount === 0 ? "sin_datos" : levelFromPercent(scorePercent),
    sectionScores,
  };
}

export interface SyncPayload {
  publicId?: string;
  nombre?: string;
  apellido?: string;
  fullName?: string;
  email?: string;
  telefono?: string;
  countryCode?: string;
  /** { "1": 3, "2": 0 } — parcial o completo, siempre se acumula */
  answers?: Record<string, number | string>;
  catalog?: IAssessmentSectionCatalog[];
  currentSectionId?: number;
  currentSectionTitle?: string;
  lastQuestionId?: number;
  lastValue?: number;
  source?: string;
  fbclid?: string;
  utm?: Record<string, string>;
  /** el cliente puede pedir cierre explicito; igual se valida el 100% real */
  complete?: boolean;
}

function normalizeAnswers(raw?: Record<string, number | string>): Map<string, number> {
  const out = new Map<string, number>();
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    out.set(String(key), num);
  }
  return out;
}

/**
 * Upsert acumulativo. Identidad = email (el funnel siempre lo valida antes de
 * abrir el wizard). Si llega publicId se respeta ese documento.
 */
export async function syncAssessment(payload: SyncPayload) {
  const email = (payload.email || "").trim().toLowerCase();
  if (!email && !payload.publicId) {
    throw new CustomError("email o publicId es requerido", 400);
  }

  let assessment: IAssessment | null = null;

  if (payload.publicId) {
    assessment = await Assessment.findOne({ publicId: payload.publicId });
  }
  if (!assessment && email) {
    assessment = await Assessment.findOne({ email });
  }

  if (!assessment) {
    if (!email) throw new CustomError("email es requerido para crear el cuestionario", 400);
    const publicId = generatePublicId();
    assessment = new Assessment({
      publicId,
      email,
      reportUrl: buildReportUrl(publicId),
      startedAt: new Date(),
    });
  }

  // --- Contacto (solo se sobreescribe con valores no vacios) ---
  if (payload.nombre) assessment.nombre = payload.nombre;
  if (payload.apellido !== undefined) assessment.apellido = payload.apellido;
  if (payload.fullName) assessment.fullName = payload.fullName;
  if (email) assessment.email = email;
  if (payload.telefono) assessment.telefono = payload.telefono;
  if (payload.countryCode) assessment.countryCode = payload.countryCode;
  if (payload.source) assessment.source = payload.source;
  if (payload.fbclid) assessment.fbclid = payload.fbclid;
  if (payload.utm && Object.keys(payload.utm).length) assessment.utm = payload.utm;

  // --- Catalogo: el funnel es la fuente de verdad del texto de las preguntas ---
  if (payload.catalog?.length) {
    assessment.catalog = payload.catalog;
  }

  // --- Respuestas: SIEMPRE se acumulan, nunca se reemplaza el mapa completo ---
  const incoming = normalizeAnswers(payload.answers);
  if (!assessment.answers) assessment.answers = new Map<string, number>();
  for (const [key, value] of incoming) {
    assessment.answers.set(key, value);
  }

  if (payload.currentSectionId !== undefined) assessment.currentSectionId = payload.currentSectionId;
  if (payload.currentSectionTitle) assessment.currentSectionTitle = payload.currentSectionTitle;
  if (payload.lastQuestionId !== undefined) assessment.lastQuestionId = payload.lastQuestionId;
  if (payload.lastValue !== undefined) assessment.lastValue = payload.lastValue;

  // --- Scoring ---
  const scoring = scoreAssessment(assessment.catalog || [], assessment.answers);
  assessment.answeredCount = scoring.answeredCount;
  assessment.totalQuestions = scoring.totalQuestions;
  assessment.percent = scoring.percent;
  assessment.score = scoring.score;
  assessment.maxScore = scoring.maxScore;
  assessment.scorePercent = scoring.scorePercent;
  assessment.riskLevel = scoring.riskLevel;
  assessment.sectionScores = scoring.sectionScores;

  assessment.reportUrl = buildReportUrl(assessment.publicId);
  assessment.lastSyncAt = new Date();

  const isComplete = scoring.totalQuestions > 0 && scoring.answeredCount >= scoring.totalQuestions;
  if (isComplete && assessment.status !== "completed") {
    assessment.status = "completed";
    assessment.completedAt = new Date();
  }

  await assessment.save();

  // El webhook del CRM se dispara solo con el cuestionario realmente al 100%
  let webhookFired = false;
  if (isComplete && !assessment.webhookFired) {
    webhookFired = await fireCompletionWebhook(assessment);
    // ...y en el mismo momento se encola el estudio. Import diferido para
    // no crear un ciclo: study.service ya importa de este módulo.
    try {
      const { enqueueStudy, scheduleQueueRun } = await import("./study.service");
      await enqueueStudy(assessment);
      scheduleQueueRun();
    } catch (error: any) {
      console.error("[assessment] no se pudo encolar el estudio:", error?.message);
    }
  }

  return {
    publicId: assessment.publicId,
    reportUrl: assessment.reportUrl,
    answeredCount: assessment.answeredCount,
    totalQuestions: assessment.totalQuestions,
    percent: assessment.percent,
    status: assessment.status,
    completed: isComplete,
    webhookFired: webhookFired || assessment.webhookFired,
  };
}

export async function getByPublicId(publicId: string) {
  const assessment = await Assessment.findOne({ publicId });
  if (!assessment) throw new CustomError("Reporte no encontrado", 404);
  return assessment;
}

export async function resendWebhook(publicId: string) {
  const assessment = await getByPublicId(publicId);
  if (assessment.status !== "completed") {
    throw new CustomError("El cuestionario aún no está completo", 400);
  }
  const ok = await fireCompletionWebhook(assessment);
  return { sent: ok, status: assessment.webhookStatus, reportUrl: assessment.reportUrl };
}

export async function listAssessments(query?: { status?: string; search?: string }) {
  const mongoQuery: Record<string, unknown> = {};
  if (query?.status) mongoQuery.status = query.status;
  if (query?.search?.trim()) {
    const regex = new RegExp(query.search.trim(), "i");
    mongoQuery.$or = [{ email: regex }, { nombre: regex }, { fullName: regex }, { telefono: regex }];
  }
  return Assessment.find(mongoQuery)
    .select("-catalog -answers")
    .sort({ updatedAt: -1 })
    .limit(200);
}
