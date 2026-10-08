import { z } from "zod";

// ENUMS
export const UserRoleSchema = z.enum(["ADMIN", "SUPERVISOR"]);
export const InspectionStatusSchema = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);
export const InspectionDecisionSchema = z.enum(["PASS", "HOLD", "REJECT"]);
export const MediaTypeSchema = z.enum(["IMAGE", "VIDEO"]);
export const DetectionSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// MODELS


export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  email: z.string().email().max(255),
  passwordHash: z.string(),
  role: UserRoleSchema,
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const InspectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: InspectionStatusSchema,
  decision: InspectionDecisionSchema.nullable(),
  contaminationScore: z.number().nullable(),
  processingTimeMs: z.number().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export const MediaSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  type: MediaTypeSchema,
  originalUrl: z.string(),
  annotatedUrl: z.string().nullable(),
  createdAt: z.date(),
});

export const DetectionSchema = z.object({
  id: z.string().uuid(),
  mediaId: z.string().uuid(),
  category: z.string().max(100),
  confidence: z.number().min(0).max(1),
  severity: DetectionSeveritySchema,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  createdAt: z.date(),
});

// TYPES

export type UserRole = z.infer<typeof UserRoleSchema>;
export type InspectionStatus = z.infer<typeof InspectionStatusSchema>;
export type InspectionDecision = z.infer<typeof InspectionDecisionSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type DetectionSeverity = z.infer<typeof DetectionSeveritySchema>;

export type User = z.infer<typeof UserSchema>;
export type Inspection = z.infer<typeof InspectionSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type Detection = z.infer<typeof DetectionSchema>;

// CREATE / UPDATE SCHEMAS

export const UserCreateSchema = UserSchema.omit({ id: true, createdAt: true });
export const UserSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleSchema.optional().default("SUPERVISOR"),
});
export const UserLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export const UserUpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  stationId: z.string().uuid().optional(),
  role: UserRoleSchema.optional(),
});
export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export type UserSignupInput = z.infer<typeof UserSignupSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type UserUpdateProfileInput = z.infer<typeof UserUpdateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
