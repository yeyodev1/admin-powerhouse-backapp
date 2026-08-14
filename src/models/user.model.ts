import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  /** `advisor` = asesor: ve y edita estudios, pero no gestiona usuarios */
  role: "admin" | "advisor" | "user";
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "advisor", "user"], default: "user" },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);