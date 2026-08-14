import mongoose, { Document, Schema } from "mongoose";

/**
 * Estudio generado por IA a partir del Cuestionario de Inteligencia Biológica PHB.
 *
 * Se acumulan: cada regeneración crea un documento nuevo con `version` incremental,
 * nunca se pisa el anterior. El admin puede editar el texto antes de enviarlo, y
 * el envío queda registrado en `deliveries`.
 */

export type StudyStatus = "queued" | "generating" | "ready" | "failed";

export interface IStudyDelivery {
  channel: "whatsapp";
  to: string;
  sentAt: Date;
  ok: boolean;
  detail?: string;
}

export interface IStudy extends Document {
  publicId: string;
  version: number;

  assessment: mongoose.Types.ObjectId;
  assessmentPublicId: string;

  // Contacto denormalizado: el estudio se consulta sin tocar el assessment
  nombre: string;
  fullName: string;
  email: string;
  telefono: string;

  status: StudyStatus;
  /** Texto del paso actual, para mostrarlo mientras se genera */
  stage: string;
  progress: number;
  error?: string;

  /** Markdown producido por la IA */
  content: string;
  /** Markdown editado por el admin; si existe, es el que se publica */
  editedContent?: string;
  edited: boolean;
  editedAt?: Date;
  editedBy?: string;

  /** `aiModel` y no `model`: Document.model ya existe en Mongoose */
  aiModel: string;
  durationMs?: number;
  deliveries: IStudyDelivery[];

  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IStudyDelivery>(
  {
    channel: { type: String, default: "whatsapp" },
    to: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now },
    ok: { type: Boolean, default: false },
    detail: { type: String },
  },
  { _id: false }
);

const StudySchema = new Schema<IStudy>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    version: { type: Number, default: 1 },

    assessment: { type: Schema.Types.ObjectId, ref: "Assessment", required: true, index: true },
    assessmentPublicId: { type: String, default: "", index: true },

    nombre: { type: String, default: "" },
    fullName: { type: String, default: "" },
    email: { type: String, default: "", index: true },
    telefono: { type: String, default: "" },

    status: {
      type: String,
      enum: ["queued", "generating", "ready", "failed"],
      default: "queued",
      index: true,
    },
    stage: { type: String, default: "En cola" },
    progress: { type: Number, default: 0 },
    error: { type: String },

    content: { type: String, default: "" },
    editedContent: { type: String },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editedBy: { type: String },

    aiModel: { type: String, default: "" },
    durationMs: { type: Number },
    deliveries: { type: [DeliverySchema], default: [] },

    queuedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

/** El texto vigente: lo editado manda sobre lo generado */
StudySchema.virtual("finalContent").get(function (this: IStudy) {
  return this.editedContent?.trim() ? this.editedContent : this.content;
});

StudySchema.set("toJSON", { virtuals: true });
StudySchema.set("toObject", { virtuals: true });

export const Study = mongoose.model<IStudy>("Study", StudySchema);
