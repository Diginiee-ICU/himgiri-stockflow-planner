import { z } from "zod";

export const adminSetupSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
  setupCode: z.string().min(1).max(1024),
});

export function setupIsClosed(completed: boolean, administratorCount: number) {
  return completed || administratorCount > 0;
}
export const adminCodeSignInSchema = z.object({
  email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
  setupCode: z.string().min(1).max(1024),
});

export function isSetupAdmin(email: string, adminEmail: string | null | undefined, isSuperAdmin: boolean, active: boolean) {
  return !!adminEmail && adminEmail.toLowerCase() === email.toLowerCase() && isSuperAdmin && active;
}
