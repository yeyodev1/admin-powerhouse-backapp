import axios from "axios";
import { IAssessment } from "../models/assessment.model";

/**
 * Contrato con el CRM: llaves de custom field, payload y disparo del webhook.
 * Vive aparte de `assessment.service.ts` para que ese archivo siga siendo solo
 * la lógica de acumulación y scoring.
 */

/** Webhook del CRM que se dispara UNA sola vez cuando el cuestionario llega al 100% */
const GHL_ASSESSMENT_WEBHOOK =
  process.env.GHL_ASSESSMENT_WEBHOOK ||
  "https://services.leadconnectorhq.com/hooks/P62nq2IVqxaQbOrD3P1R/webhook-trigger/S99es9hXTIfKesdWrKBW";

export const LEVEL_LABELS: Record<string, string> = {
  optimo: "Óptimo",
  vigilancia: "Vigilancia",
  alerta: "Alerta",
  prioritario: "Prioritario",
  sin_datos: "Sin datos",
};

/**
 * Replica EXACTA de cleanStringForGhl del funnel.
 * No normaliza acentos a proposito: las llaves de custom field ya existentes en
 * GHL se generaron con esta misma logica y cambiarlas desconecta los campos.
 */
export function cleanStringForGhl(str: string): string {
  let cleaned = str.toLowerCase();
  cleaned = cleaned.replace(/[\s\t\n\r\-\/]+/g, "_");
  cleaned = cleaned.replace(/[^a-z0-9_]/g, "");
  cleaned = cleaned.replace(/_+/g, "_");
  cleaned = cleaned.replace(/^_+|_+$/g, "");
  return cleaned;
}

export function getQuestionGhlKey(question: { id: number; text: string }): string {
  return `${question.id}_${cleanStringForGhl(question.text)}`;
}

function priorityTitles(assessment: IAssessment): string[] {
  return (assessment.sectionScores || [])
    .filter((s) => s.level === "prioritario" || s.level === "alerta")
    .sort((a, b) => b.percent - a.percent)
    .map((s) => s.title);
}

/** Texto legible que viaja al CRM como nota del contacto */
export function buildSummaryText(assessment: IAssessment): string {
  const lines = [
    "🧬 Cuestionario de Inteligencia Biológica PHB — COMPLETADO AL 100%",
    `👤 ${assessment.fullName || `${assessment.nombre} ${assessment.apellido}`.trim()}`,
    `✅ Respondidas: ${assessment.answeredCount}/${assessment.totalQuestions}`,
    `📊 Carga sintomática global: ${assessment.scorePercent}% (${LEVEL_LABELS[assessment.riskLevel] || assessment.riskLevel})`,
    `🔗 Reporte: ${assessment.reportUrl}`,
    "",
    "📌 Por sistema:",
  ];

  for (const section of assessment.sectionScores || []) {
    lines.push(
      `• ${section.title}: ${section.score}/${section.maxScore} (${section.percent}% — ${LEVEL_LABELS[section.level] || section.level})`
    );
  }

  const priority = priorityTitles(assessment).slice(0, 3);
  if (priority.length) {
    lines.push("", `🚩 Sistemas a revisar primero: ${priority.join(", ")}`);
  }

  return lines.join("\n");
}

/** Payload que recibe el CRM. `reporte_url` es la variable para la plantilla. */
export function buildWebhookPayload(assessment: IAssessment) {
  const cuestionario: Record<string, number | string> = {};
  const cuestionarioRaw: Record<string, number> = {};

  for (const section of assessment.catalog || []) {
    for (const question of section.questions) {
      const value = assessment.answers?.get(String(question.id));
      cuestionario[getQuestionGhlKey(question)] = value !== undefined ? value : "";
      if (value !== undefined) cuestionarioRaw[String(question.id)] = value;
    }
  }

  const note = buildSummaryText(assessment);

  return {
    // contacto
    nombre: assessment.nombre,
    apellido: assessment.apellido,
    nombre_completo: assessment.fullName || `${assessment.nombre} ${assessment.apellido}`.trim(),
    email: assessment.email,
    telefono: assessment.telefono,

    // estado
    paso: "cuestionario_phb_completado",
    estado: "completado",
    evento: "cuestionario_100",
    respondidas: assessment.answeredCount,
    total_preguntas: assessment.totalQuestions,
    porcentaje_completado: assessment.percent,

    // LINK RAPIDO — variable para la plantilla del CRM.
    // `reporte_url` es la URL completa; `reporte_slug` es solo el identificador,
    // que es lo que pide un boton de URL dinamica de WhatsApp (base + {{1}}).
    reporte_url: assessment.reportUrl,
    reporte_slug: assessment.publicId,
    reporte_id: assessment.publicId,

    // scoring
    puntaje_total: assessment.score,
    puntaje_maximo: assessment.maxScore,
    carga_sintomatica: assessment.scorePercent,
    nivel_global: assessment.riskLevel,
    nivel_global_label: LEVEL_LABELS[assessment.riskLevel] || assessment.riskLevel,
    sistemas_prioritarios: priorityTitles(assessment).join(", "),
    secciones: assessment.sectionScores,

    // respuestas
    cuestionario,
    cuestionario_raw: cuestionarioRaw,

    // nota para el CRM
    note,
    nota: note,
    resumen: note,

    source: assessment.source,
    fbclid: assessment.fbclid || "",
    completado_en: assessment.completedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Dispara el webhook del CRM. Idempotente: marca `webhookFired` y no reintenta
 * solo. Nunca lanza: el fallo del CRM no puede tumbar el sync del lead.
 */
export async function fireCompletionWebhook(assessment: IAssessment): Promise<boolean> {
  if (!GHL_ASSESSMENT_WEBHOOK) return false;

  const payload = buildWebhookPayload(assessment);
  assessment.webhookAttempts = (assessment.webhookAttempts || 0) + 1;

  try {
    const response = await axios.post(GHL_ASSESSMENT_WEBHOOK, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    assessment.webhookFired = true;
    assessment.webhookFiredAt = new Date();
    assessment.webhookStatus = `ok:${response.status}`;
    await assessment.save();
    console.log(`[assessment] webhook CRM enviado ${assessment.publicId} (${response.status})`);
    return true;
  } catch (error: any) {
    assessment.webhookStatus = `error:${error?.response?.status || error?.code || "unknown"}`;
    await assessment.save();
    console.error(`[assessment] webhook CRM fallo ${assessment.publicId}:`, error?.message);
    return false;
  }
}
