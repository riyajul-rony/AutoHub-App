"use client";

import React, { useActionState } from "react";
import type { FormState } from "@/server/auth/actions";
import { Input, Button } from "@/components/ui";

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
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

      {fields.map((f) => (
        <Input
          key={f.name}
          id={`${id}-${f.name}`}
          name={f.name}
          label={f.label}
          type={f.type ?? "text"}
          placeholder={f.placeholder}
          autoComplete={f.autoComplete}
          required={f.required ?? true}
          defaultValue={f.defaultValue}
        />
      ))}

      {state?.error ? (
        <div
          role="alert"
          className="rounded-[6px] border border-danger/30 bg-danger-bg p-2.5 text-xs text-danger font-medium"
        >
          {state.error}
        </div>
      ) : null}

      {state?.message ? (
        <div
          role="status"
          className="rounded-[6px] border border-success/30 bg-success-bg p-2.5 text-xs text-success font-medium"
        >
          {state.message}
        </div>
      ) : null}

      <Button
        id={`${id}-submit`}
        type="submit"
        variant="primary"
        size="md"
        loading={pending}
        className="w-full mt-2"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
