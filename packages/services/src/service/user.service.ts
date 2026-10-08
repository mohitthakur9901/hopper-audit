import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, type UserRole } from "@repo/database";
import {
  UserSignupSchema,
  UserLoginSchema,
  UserUpdateProfileSchema,
  UpdatePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type UserSignupInput,
  type UserLoginInput,
  type UserUpdateProfileInput,
  type UpdatePasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@repo/types";
import { userRepository } from "../repositories/user.repository.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "default_jwt_access_secret_key_123";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "default_jwt_refresh_secret_key_123";
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "default_jwt_reset_secret_key_123";
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ResetTokenPayload {
  userId: string;
  email: string;
  type: "reset_password";
}

export class UserService {
  private generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
  }

  verifyRefreshToken(token: string): { userId: string; email: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; email: string };
  }

  private sanitizeUser<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async signup(data: UserSignupInput | (Prisma.UserCreateInput & { password?: string })) {
    const validated = UserSignupSchema.parse(data);

    const existingUser = await userRepository.findByEmail(validated.email);
    if (existingUser) {
      throw new Error(`User with email '${validated.email}' already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const createdUser = await userRepository.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role as UserRole,
    });

    const tokens = this.generateTokens({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    const updatedUser = await userRepository.update(createdUser.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return {
      user: this.sanitizeUser(updatedUser),
      tokens,
    };
  }

  async login(data: UserLoginInput | { email: string; password: string }) {
    const validated = UserLoginSchema.parse(data);

    const user = await userRepository.findByEmail(validated.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const updatedUser = await userRepository.update(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return {
      user: this.sanitizeUser({ ...user, ...updatedUser }),
      tokens,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID '${userId}' not found`);
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: UserUpdateProfileInput) {
    const validated = UserUpdateProfileSchema.parse(data);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID '${userId}' not found`);
    }

    if (validated.email && validated.email !== user.email) {
      const emailExists = await userRepository.findByEmail(validated.email);
      if (emailExists && emailExists.id !== userId) {
        throw new Error(`Email '${validated.email}' is already in use`);
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(validated.name !== undefined && { name: validated.name }),
      ...(validated.email !== undefined && { email: validated.email }),
      ...(validated.role !== undefined && { role: validated.role as UserRole }),
    };

    const updated = await userRepository.update(userId, updateData);
    return this.sanitizeUser(updated);
  }

  async updatePassword(userId: string, data: UpdatePasswordInput) {
    const validated = UpdatePasswordSchema.parse(data);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID '${userId}' not found`);
    }

    const isMatch = await bcrypt.compare(validated.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(validated.newPassword, salt);

    await userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    return {
      success: true,
      message: "Password updated successfully",
    };
  }

  async logout(userId: string) {
    await userRepository.update(userId, {
      accessToken: null,
      refreshToken: null,
    });

    return {
      success: true,
      message: "Logged out successfully",
    };
  }

  async refreshToken(refreshTokenStr: string) {
    if (!refreshTokenStr) {
      throw new Error("Refresh token is required");
    }

    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(refreshTokenStr, JWT_REFRESH_SECRET) as { userId: string; email: string };
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error("User associated with token not found");
    }

    if (user.refreshToken !== refreshTokenStr) {
      throw new Error("Refresh token revoked or mismatch");
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const updatedUser = await userRepository.update(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return {
      user: this.sanitizeUser(updatedUser),
      tokens,
    };
  }

  async forgotPassword(data: ForgotPasswordInput | string) {
    const email = typeof data === "string" ? data : data.email;
    ForgotPasswordSchema.parse({ email });

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error(`User with email '${email}' not found`);
    }

    const resetPayload: ResetTokenPayload = {
      userId: user.id,
      email: user.email,
      type: "reset_password",
    };

    const resetToken = jwt.sign(resetPayload, JWT_RESET_SECRET, { expiresIn: "15m" });

    return {
      success: true,
      message: "Password reset token generated successfully",
      resetToken,
    };
  }

  async resetPassword(data: ResetPasswordInput | { token: string; newPassword: string }) {
    const validated = ResetPasswordSchema.parse(data);

    let decoded: ResetTokenPayload;
    try {
      decoded = jwt.verify(validated.token, JWT_RESET_SECRET) as ResetTokenPayload;
    } catch {
      throw new Error("Invalid or expired password reset token");
    }

    if (decoded.type !== "reset_password") {
      throw new Error("Invalid token type for password reset");
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.newPassword, salt);

    await userRepository.update(user.id, {
      passwordHash,
      accessToken: null,
      refreshToken: null,
    });

    return {
      success: true,
      message: "Password has been reset successfully",
    };
  }
}

export const userService = new UserService();