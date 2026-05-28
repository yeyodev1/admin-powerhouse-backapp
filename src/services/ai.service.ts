import axios from "axios";
import { CustomError } from "../errors/customError.error";

export class AIService {
  private openAiKey: string;
  private anthropicKey: string;

  constructor() {
    this.openAiKey = process.env.OPENAI_API_KEY || "";
    this.anthropicKey = process.env.ANTHROPIC_API_KEY || "";

    if (!this.openAiKey) {
      console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables.");
    }
    if (!this.anthropicKey) {
      console.warn("WARNING: ANTHROPIC_API_KEY is not defined in environment variables.");
    }
  }

  /**
   * Run OpenAI GPT-4o analysis on patient context and clinical files.
   */
  async analyzeClinicalFiles(patientContext: string, files: any[]): Promise<string> {
    if (!this.openAiKey) {
      throw new CustomError("OpenAI API key is missing on the server configuration.", 500);
    }

    try {
      const fileContents: any[] = [];

      for (const file of files) {
        if (file.type && file.type.includes("pdf")) {
          fileContents.push({
            type: "text",
            text: `[DOCUMENT: ${file.filename}]\n${file.text || ""}`,
          });
        } else if (file.type && file.type.includes("image")) {
          fileContents.push({
            type: "image_url",
            image_url: {
              url: file.url, // Base64 data URL
            },
          });
        } else {
          fileContents.push({
            type: "text",
            text: `[DOCUMENT: ${file.filename}]\n${file.text || "(Non-parsable format)"}`,
          });
        }
      }

      const maestroSystemPrompt = `Actúa como un panel interdisciplinario de expertos compuesto por médicos internistas, medicina funcional, longevidad, bioquímica clínica, inmunología, endocrinología, neurología, cardiometabolismo, medicina regenerativa, biología celular y análisis avanzado de biomarcadores.
Analiza integralmente los estudios clínicos, imágenes de laboratorio, antecedentes, síntomas, edad, sexo, diagnósticos, medicamentos, historial médico y contexto fisiológico del paciente.
Entrega el análisis con el siguiente formato:

Resumen Ejecutivo del Caso Clínico
 Descripción clara y comprensible del estado general del paciente.

Integración Sistémica
 Explica cómo interactúan los sistemas: metabólico, inflamatorio, inmune, hormonal, cardiovascular, renal, hepático, neurológico, gastrointestinal y mitocondrial.

Interpretación Biomarcador por Biomarcador
 Describe qué mide, rango esperado, hallazgo, posible significado clínico, relaciones fisiológicas y relevancia regenerativa.

Patrones Ocultos y Correlaciones
 Identifica inflamación silenciosa, insulinorresistencia, estrés oxidativo, inmunosenescencia, fragilidad, disfunción mitocondrial, envejecimiento acelerado, toxicidad, inflamaging o desregulación hormonal.

Hipótesis Clínicas Integrativas
 Explica posibles causas raíz, interacciones y prioridades.

Riesgos Actuales y Proyección a 3–10 años
 Escenarios probables si continúa igual o si interviene.

Evaluación de Viabilidad Regenerativa (EVR)
 Clasifica: Sí candidato / Aún no / No candidato, justificando por biomarcadores, inflamación, microambiente celular y capacidad regenerativa.

Priming Biológico y Ruta de Optimización (90 días)
 Nutrición, biomarcadores prioritarios, suplementos, hábitos, estudios complementarios y preparación biológica antes de terapias regenerativas.

Feedback Humano y Educativo al Paciente
 Explica los hallazgos en lenguaje claro, honesto, empático y accionable, evitando falsas promesas y priorizando decisiones informadas.

Conclusión Estratégica
 Resume el caso como un verdadero “mapa biológico” del paciente, destacando prioridades, ventanas de oportunidad y limitaciones fisiológicas.

IMPORTANTE: Al final de tu reporte, agrega una sección delimitada exactamente por las marcas "---JSON_EXTRACTED---" y "---JSON_EXTRACTED---". Dentro de esta sección, debes incluir un JSON con la estructura descrita abajo, extrayendo valores específicos a partir de los estudios clínicos para el paciente. Si no encuentras algún dato, infiérelo clínicamente o usa valores por defecto.
Estructura JSON:
{
  "ercStage": "Estadio de la ERC inferido (ej. ERC Estadio 5)",
  "ercCause": "Causa probable de la ERC (ej. Nefropatía Diabética, Glomerulonefritis)",
  "transplantStatus": "Estado del trasplante (ej. Candidato a trasplante pre-emptivo / En lista de espera)",
  "labValues": "Resumen rápido de valores claves separados por comas (ej. eGFR: 8 mL/min, Creatinina: 6.2 mg/dL, PTH: 350 pg/mL, Ácido Úrico: 8.5 mg/dL)",
  "biologicalDetails": "Detalles biológicos resumidos (ej. Paciente joven, buen estado nutricional, potencial donante vivo)"
}`;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            { role: "system", content: maestroSystemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: patientContext },
                ...fileContents,
              ],
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openAiKey}`,
          },
          timeout: 300000,
        }
      );

      return response.data?.choices?.[0]?.message?.content || "";
    } catch (err: any) {
      console.error("OpenAI API call failed:", err.response?.data || err.message);
      throw new CustomError(
        err.response?.data?.error?.message || "Failed to communicate with OpenAI API.",
        err.response?.status || 500
      );
    }
  }

  /**
   * Run Anthropic Claude (Sonnet) to generate the final specialized report.
   */
  async generateRegenerativeReport(params: any, openAiResult: string): Promise<string> {
    if (!this.anthropicKey) {
      throw new CustomError("Anthropic API key is missing on the server configuration.", 500);
    }

    try {
      const patientDataPrompt = `DATOS DEL PACIENTE:
- Nombre Completo: ${params.name || ""}
- Estadio de ERC y Causa: ${params.ercStage || ""}
- Estado de Trasplante: ${params.transplantStatus || ""}
- Datos de Laboratorio Actuales: ${params.labValues || ""}
- Centro de Evaluación: ${params.evaluationCenter || ""}
- Detalles Biológicos: ${params.biologicalDetails || ""}

ANÁLISIS CLÍNICO PREVIO (OpenAI):
${openAiResult}`;

      const claudeSystemPrompt = `Eres un experto en Medicina Regenerativa aplicada a la Nefrología y un redactor médico de élite. Tu objetivo es generar un informe clínico personalizado titulado "MEDICINA REGENERATIVA: Estrategia Complementaria en Enfermedad Renal Crónica y Trasplante Renal", diseñado para un paciente específico.

INSTRUCCIONES DE TONO Y ESTILO:
- Tono: Altamente profesional, científico, realista, empático pero riguroso.
- Enfoque Médico Cauto: Debes enfatizar que las terapias celulares/exosomales son COMPLEMENTARIAS. Bajo ninguna circunstancia debes prometer la "regeneración" o reversión estructural de un riñón terminal o con cicatrización avanzada (como en ERC Estadio 5). Evita falsas expectativas.
- Formato: Utiliza tablas de Markdown para las secciones clave, negritas para guiar la lectura y listas con viñetas limpias. El diseño visual debe ser idéntico al modelo de referencia.

ESTRUCTURA DEL OUTPUT (DEBES REPLICAR ESTA ESTRUCTURA EXACTA):

### ENCABEZADO
Crea una tabla con el siguiente formato:
| MEDICINA REGENERATIVA, Estrategia Complementaria en Enfermedad Renal Crónica y Trasplante Renal | Preparado para: [Nombre del Paciente] | [Estadio de ERC y Causa] | [Estado de Trasplante] |

### CONTEXTO CLÍNICO
Crea una tabla con el contexto clínico:
| Contexto Clínico | [Redactar un párrafo que resuma la situación actual del paciente basándose en su eGFR y creatinina. Menciona el daño estructural avanzado y aclara que la prioridad sigue siendo el trasplante, pero que existe una "ventana biológica" estratégica para terapias celulares y exosomales]. |

### — 1. MECANISMO DE ACCIÓN: CÉLULAS MADRE MESENQUIMALES (MSC)
- Explica que las MSC no reemplazan el tejido renal dañado, sino que actúan por señalización paracrina e inmunomodulación.
- Lista las moléculas bioactivas que liberan (Citoquinas antiinflamatorias, Factores de crecimiento, MicroRNAs y vesículas extracelulares/exosomas).
- Describe su capacidad para modular la inflamación, reducir el estrés oxidativo y mejorar el microambiente renal residual.

### — 2. OBJETIVOS ANTES DEL TRASPLANTE
- Aclara que el objetivo no es regenerar el riñón cicatrizado, sino un fin estratégico y sistémico.
- Tabla de Objetivo:
| Objetivo estratégico pre-trasplante | Reducir la carga inflamatoria sistémica · Mejorar el entorno inmunológico y metabólico · Modular el estado pro-fibrótico · Llegar al trasplante en mejor condición fisiológica |
- Relación con Laboratorios: Analiza los laboratorios específicos proporcionados por el usuario (ej. Hiperparatiroidismo secundario, Acidosis metabólica, Hiperuricemia, Anemia renal progresiva) y explica cómo las MSC ayudan a reducir los mediadores inflamatorios (TNF-α, IL-6, TGF-β) y modular los linfocitos T reguladores en el contexto de su enfermedad base.
- Añade un párrafo breve sobre el potencial de los Exosomas como una de las áreas más prometedoras sin necesidad de transferencia celular masiva.

### — 3. BENEFICIOS ESPERADOS ANTES DEL TRASPLANTE
- Lista en viñetas los beneficios sistémicos y funcionales (Estabilidad metabólica, reducción de inflamación crónica, mejor recuperación de energía/fatiga, posible desaceleración de la progresión residual, preparación inmunológica/vascular para la cirugía).
- Menciona la relevancia de actuar en esta ventana biológica si el paciente aún no presenta un síndrome urémico severo descompensado.

### — 4. PRIMADO INMUNOMETABÓLICO – TERAPIA DE INFUSIÓN ESPECIALIZADA
- Explica el estado de inflamación persistente y disfunción mitocondrial en ERC avanzada.
- Detalla cómo un protocolo de infusión ayuda a corregir deficiencias, optimizar la función antioxidante y mejorar el metabolismo energético mediante aminoácidos específicos, vitaminas antioxidantes y soporte mitocondrial.

### — 5. MAYOR POTENCIAL ESTRATÉGICO: POST-TRASPLANTE
- Explica la transición inmunológica y metabólica del injerto (estrés oxidativo, lesión por isquemia-reperfusión).
- Tabla Post-trasplante:
| Aplicación post-trasplante de MSCs y exosomas | [Explicar brevemente cómo los estudios exploran el uso de MSCs para modular el rechazo, reducir la inflamación y promover la tolerancia inmunológica influyendo en células dendríticas y perfiles reguladores]. |
- Aclara que esto NO reemplaza a los inmunosupresores convencionales.
- Lista las funciones de los exosomas en el post-trasplante (reparación endotelial, reducción de daño oxidativo, soporte de microvascularización del injerto).

### — 6. MARCO DE RESPONSABILIDAD MÉDICA
- Tabla de Clarificación:
| Aclaración importante | Este protocolo NO debe interpretarse como: un sustituto del trasplante renal · una garantía contra el rechazo · una promesa de reversión renal estructural. La medicina regenerativa madura despliega estas herramientas solo donde genuinamente pueden aportar valor biológico. |
- Añade un párrafo personalizando el caso del paciente (ej. destacando si es joven, su estado nutricional, o si cuenta con un potencial donante vivo) para justificar por qué optimizar su entorno biológico es valioso.

### — 7. ESTRATEGIA INTEGRADA RECOMENDADA
- Tabla de Conclusión:
| Conclusión de la Evaluación | [Redactar una conclusión donde se declare al paciente como un candidato ideal para recibir tratamiento regenerativo complementario antes y después del trasplante]. |
- Puntos Recomendados (Lista numerada):
  1. Prioridad absoluta: Continuar y completar el proceso formal de evaluación de trasplante en su centro médico (ej. UCSF).
  2. Candidato ideal — Protocolo pre-trasplante: Resumen de sus condiciones óptimas para el protocolo pre-cirugía.
  3. Candidato ideal — Soporte post-trasplante: Enfoque post-quirúrgico en modulación inmune y reducción del estrés oxidativo del injerto.
- Tabla de Visión:
| Visión Integrativa | La medicina regenerativa bien aplicada no compite con la nefrología moderna. Su verdadero potencial radica en complementar inteligentemente los dos momentos más críticos de la trayectoria clínica: la preparación para el trasplante y la adaptación posterior. |

### BIBLIOGRAFÍA RECOMENDADA
Genera una lista de 8 a 10 referencias bibliográficas reales y académicas en formato estándar (autores, revista, año) relacionadas con MSCs, exosomas, fibrosis renal y trasplante (puedes incluir autores de renombre como Caplan AI, Westenfelder C, etc.).

### PIE DE PÁGINA / CIERRE INSTITUCIONAL
| Power House Biotech | Medicina Regenerativa & Longevidad Avanzada | Emitido: [Mes y Año Actual] | Documento confidencial |`;

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: claudeSystemPrompt,
          messages: [{ role: "user", content: patientDataPrompt }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          timeout: 300000,
        }
      );

      return response.data?.content?.[0]?.text || "";
    } catch (err: any) {
      const errorDetails = err.response?.data || err.message;
      console.error("Anthropic API call failed:", errorDetails);
      throw new CustomError(
        typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails,
        err.response?.status || 500
      );
    }
  }
}

export const aiService = new AIService();
