"use client";

import { useActionState } from "react";
import type { FormState } from "@/server/auth/actions";

export type FieldDef = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  id,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: FieldDef[];
  submitLabel: string;
  hidden?: Record<string, string>;
  id: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form id={id} action={formAction} className="space-y-4">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={`${id}-${f.name}`}>{f.label}</label>
          <input
            id={`${id}-${f.name}`}
            name={f.name}
            type={f.type ?? "text"}
            className="input"
            placeholder={f.placeholder}
            autoComplete={f.autoComplete}
            required={f.required ?? true}
            defaultValue={f.defaultValue}
          />
        </div>
      ))}
      {state?.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="rounded-xl border border-accent-green/40 bg-accent-green/10 px-3 py-2 text-sm text-accent-green">
          {state.message}
        </p>
      )}
      <button id={`${id}-submit`} className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
