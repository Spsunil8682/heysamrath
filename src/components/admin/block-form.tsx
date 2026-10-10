"use client";

import { useActionState, useState } from "react";
import { createBlock } from "@/app/admin/_actions/availability";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";

export function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createBlock, initialActionState);
  const [partial, setPartial] = useState(false);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field id="startDate" label="From" error={fe.startDate}>
          <Input id="startDate" name="startDate" type="date" min={today} required />
        </Field>
        <Field id="endDate" label="To" error={fe.endDate}>
          <Input id="endDate" name="endDate" type="date" min={today} required />
        </Field>
      </div>
      <Checkbox label="Only part of the day (single date)" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
      {partial && (
        <div className="grid grid-cols-2 gap-3">
          <Field id="startTime" label="From time" error={fe.startTime}>
            <Input id="startTime" name="startTime" type="time" required />
          </Field>
          <Field id="endTime" label="To time" error={fe.endTime}>
            <Input id="endTime" name="endTime" type="time" required />
          </Field>
        </div>
      )}
      <Field id="reason" label="Private note (optional)" error={fe.reason}>
        <Input id="reason" name="reason" maxLength={200} placeholder="e.g. Travel, personal" />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Block time"}
      </Button>
    </form>
  );
}
