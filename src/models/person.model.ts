import mongoose, { Document, Schema } from "mongoose";

export interface IMedicalFile {
  url: string;
  filename: string;
  type: string;
  uploadedAt: Date;
}

export interface IPerson extends Document {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  medicalFiles: IMedicalFile[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalFileSchema = new Schema<IMedicalFile>({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  type: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const PersonSchema = new Schema<IPerson>(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    dateOfBirth: { type: String },
    address: { type: String },
    notes: { type: String },
    medicalFiles: [MedicalFileSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Person = mongoose.model<IPerson>("Person", PersonSchema);
