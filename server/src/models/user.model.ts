import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["learner", "admin"], default: "learner", required: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: "admin" } });

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const UserModel = model("User", userSchema);
