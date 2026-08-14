import mongoose, { Document, Schema } from "mongoose";

/**
 * Cuestionario de Inteligencia Biologica PHB.
 *
 * Un Assessment es el estado acumulado del cuestionario de un lead que viene
 * del funnel publico. Se va sincronizando en segundo plano en cada respuesta
 * (upsert por email) y al llegar al 100% dispara el webhook del CRM con el
 * link publico del reporte como variable.
 */

export interface IAssessmentQuestion {
  id: number;
  section: number;
  text: string;
  interpretation: string;
  biomarkers: string;
}

export interface IAssessmentSectionCatalog {
  id: number;
  title: string;
  summary?: string;
  why?: string;
  questions: IAssessmentQuestion[];
}

export interface IAssessmentSectionScore {
  id: number;
  title: string;
  answered: number;
  total: number;
  score: number;
  maxScore: number;
  percent: number;
  level: string;
}

export interface IAssessment extends Document {
  publicId: string;
  nombre: string;
  apellido: string;
  fullName: string;
  email: string;
  telefono: string;
  countryCode: string;

  /** questionId (string) -> valor 0..3 */
  answers: Map<string, number>;
  /** snapshot del catalogo enviado por el funnel (fuente de verdad del texto) */
  catalog: IAssessmentSectionCatalog[];

  answeredCount: number;
  totalQuestions: number;
  percent: number;

  score: number;
  maxScore: number;
  scorePercent: number;
  riskLevel: string;
  sectionScores: IAssessmentSectionScore[];

  status: "in_progress" | "completed";
  currentSectionId: number;
  currentSectionTitle: string;
  lastQuestionId: number;
  lastValue: number;

  source: string;
  fbclid?: string;
  utm?: Record<string, string>;

  reportUrl: string;
  webhookFired: boolean;
  webhookFiredAt?: Date;
  webhookStatus?: string;
  webhookAttempts: number;

  startedAt: Date;
  lastSyncAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IAssessmentQuestion>(
  {
    id: { type: Number, required: true },
    section: { type: Number, required: true },
    text: { type: String, default: "" },
    interpretation: { type: String, default: "" },
    biomarkers: { type: String, default: "" },
  },
  { _id: false }
);

const SectionCatalogSchema = new Schema<IAssessmentSectionCatalog>(
  {
    id: { type: Number, required: true },
    title: { type: String, default: "" },
    summary: { type: String, default: "" },
    why: { type: String, default: "" },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
);

const SectionScoreSchema = new Schema<IAssessmentSectionScore>(
  {
    id: { type: Number, required: true },
    title: { type: String, default: "" },
    answered: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    level: { type: String, default: "sin_datos" },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessment>(
  {
    publicId: { type: String, required: true, unique: true, index: true },

    nombre: { type: String, default: "" },
    apellido: { type: String, default: "" },
    fullName: { type: String, default: "" },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    telefono: { type: String, default: "" },
    countryCode: { type: String, default: "" },

    answers: { type: Map, of: Number, default: () => new Map<string, number>() },
    catalog: { type: [SectionCatalogSchema], default: [] },

    answeredCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    scorePercent: { type: Number, default: 0 },
    riskLevel: { type: String, default: "sin_datos" },
    sectionScores: { type: [SectionScoreSchema], default: [] },

    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      index: true,
    },
    currentSectionId: { type: Number, default: 0 },
    currentSectionTitle: { type: String, default: "" },
    lastQuestionId: { type: Number, default: 0 },
    lastValue: { type: Number, default: 0 },

    source: { type: String, default: "funnel_rutas_medicina_regenerativa" },
    fbclid: { type: String },
    utm: { type: Schema.Types.Mixed },

    reportUrl: { type: String, default: "" },
    webhookFired: { type: Boolean, default: false },
    webhookFiredAt: { type: Date },
    webhookStatus: { type: String },
    webhookAttempts: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Assessment = mongoose.model<IAssessment>("Assessment", AssessmentSchema);
