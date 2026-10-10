"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/_actions/auth";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialActionState);
  return (
    <form action={action} className="space-y-5">
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
