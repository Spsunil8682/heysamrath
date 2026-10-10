import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { assertAdmin, UnauthorizedError, type AdminContext } from "@/lib/auth/admin";
import type { ActionState } from "./action-state";

/**
 * Every admin Server Action runs through this: it re-verifies the session and the admin role on the
 * server (never trusting the UI), and converts failures into safe messages.
 */
export async function withAdmin(fn: (ctx: AdminContext) => Promise<ActionState>): Promise<ActionState> {
  try {
    const ctx = await assertAdmin();
    return await fn(ctx);
  } catch (e) {
    unstable_rethrow(e); // let redirect()/notFound() through
    if (e instanceof UnauthorizedError) {
      return { ok: false, message: "Your session has expired or you are not an administrator. Please sign in again." };
    }
    console.error("Admin action failed", e instanceof Error ? e.message : e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export function zodState(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
}
