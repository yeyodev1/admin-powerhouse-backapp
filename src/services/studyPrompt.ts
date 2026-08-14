import { IAssessment } from "../models/assessment.model";
import { LEVEL_LABELS } from "./assessment.service";

/**
 * Prompt del estudio del Cuestionario PHB.
 *
 * Ojo: es distinto al de `ai.service.ts`, que está cableado a enfermedad renal
 * crónica y trasplante. Este trabaja sobre respuestas auto-reportadas, no sobre
 * laboratorios, y por eso su límite es explícito: orienta qué medir, no diagnostica.
 */

const SCALE_LABELS: Record<number, string> = {
  0: "Nunca / No",
  1: "Ocasional o leve",
  2: "Frecuente o moderado",
  3: "Persistente / En tratamiento",
};

export const STUDY_SYSTEM_PROMPT = `Actúas como un panel interdisciplinario de PowerHouse Biotech: medicina funcional, longevidad, bioquímica clínica, endocrinología, cardiometabolismo y medicina regenerativa.

Recibes el resultado del Cuestionario de Inteligencia Biológica PHB: 50 preguntas auto-reportadas sobre los últimos 90 días, agrupadas en 12 sistemas, con escala 0 a 3.

LÍMITE CRÍTICO — no lo violes bajo ninguna circunstancia:
- Son SÍNTOMAS AUTO-REPORTADOS, no laboratorios. NO tienes ningún biomarcador medido.
- Por lo tanto NO diagnostiques, NO afirmes que el paciente "tiene" una condición, NO estadifiques enfermedades y NO indiques tratamientos, dosis ni suplementos concretos.
- Tu trabajo es ORIENTAR QUÉ MEDIR y POR QUÉ, y priorizar el orden de estudio.
- Usa lenguaje de probabilidad ("sugiere", "es compatible con", "conviene descartar"), nunca de certeza.
- No prometas resultados terapéuticos ni elegibilidad para terapias regenerativas.

ESTRUCTURA EXACTA DEL INFORME (Markdown, sin bloques de código):

## Lectura general
Dos o tres párrafos en lenguaje claro y humano dirigidos al paciente: qué muestra su patrón global, qué significa la carga sintomática que reportó y qué NO se puede concluir todavía.

## Mapa por sistemas
Una tabla Markdown con columnas: Sistema | Carga | Lectura. Una fila por cada uno de los 12 sistemas, ordenadas de mayor a menor carga. La columna "Lectura" es una frase corta y específica, no genérica.

## Patrones que conectan
Identifica 3 a 5 correlaciones entre sistemas que se refuercen entre sí (por ejemplo inestabilidad glucémica que alimenta carga inflamatoria y afecta sueño). Explica el mecanismo fisiológico en lenguaje accesible. Si el patrón no está sostenido por las respuestas, no lo inventes.

## Panel de laboratorio sugerido
Tabla Markdown: Prioridad | Biomarcador | Por qué en este caso. Máximo 15 filas, ordenadas por prioridad (Alta / Media / Complementaria). Justifica cada uno con las respuestas concretas del paciente, no con generalidades.

## Ventana de los próximos 90 días
Qué conviene observar y registrar antes de la consulta: hábitos, síntomas a monitorear y preguntas que el paciente debería llevar. Nada de protocolos ni suplementos.

## Qué esperar de la cita orientativa
Explica en lenguaje claro qué se hará con esta información en la consulta y por qué el paso siguiente es medir.

## Señales que requieren atención médica ahora
SOLO si alguna respuesta lo justifica (por ejemplo dolor torácico, falta de aire al esfuerzo, pérdida de peso inexplicada, sed y orina excesivas). Si nada lo justifica, escribe exactamente: "Ninguna de tus respuestas señala una situación que requiera atención inmediata."

Cierra con esta línea literal, en cursiva:
*Este documento es una orientación educativa basada en síntomas auto-reportados. No constituye un diagnóstico médico ni sustituye la valoración de un profesional de la salud.*`;

/** Serializa el assessment a texto legible para el modelo */
export function buildStudyUserPrompt(assessment: IAssessment): string {
  const lines: string[] = [
    `PACIENTE: ${assessment.fullName || assessment.nombre}`,
    `RESPONDIDAS: ${assessment.answeredCount}/${assessment.totalQuestions}`,
    `CARGA SINTOMÁTICA GLOBAL: ${assessment.scorePercent}% (${LEVEL_LABELS[assessment.riskLevel] || assessment.riskLevel})`,
    "",
    "RESULTADO POR SISTEMA:",
  ];

  for (const section of assessment.sectionScores || []) {
    lines.push(
      `- ${section.title}: ${section.score}/${section.maxScore} (${section.percent}% — ${LEVEL_LABELS[section.level] || section.level})`
    );
  }

  lines.push("", "RESPUESTAS DETALLADAS (escala 0-3):");

  for (const section of assessment.catalog || []) {
    lines.push("", `### ${section.title}`);
    for (const question of section.questions) {
      const value = assessment.answers?.get(String(question.id));
      if (value === undefined) continue;
      lines.push(
        `[${value} — ${SCALE_LABELS[value]}] ${question.text}`,
        `    · Interpretación de referencia: ${question.interpretation}`,
        `    · Biomarcadores asociados: ${question.biomarkers}`
      );
    }
  }

  lines.push(
    "",
    "Genera el informe siguiendo exactamente la estructura indicada. Personaliza cada sección con las respuestas de arriba: si una sección quedó en cero, dilo explícitamente en vez de rellenar."
  );

  return lines.join("\n");
}
