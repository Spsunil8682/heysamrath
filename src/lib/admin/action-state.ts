export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  warnings?: string[];
};

export const initialActionState: ActionState = { ok: false };
