import type { Dispatch, SetStateAction } from "react";
import type { ChangeEvent } from "react";
import type { ConnectionForm } from "@/services/api";

export function useFormField<T extends keyof ConnectionForm>(
  form: ConnectionForm,
  setForm: Dispatch<SetStateAction<ConnectionForm>>,
  field: T,
  transformer?: (raw: string) => ConnectionForm[T],
): [ConnectionForm[T], (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void] {
  const value = form[field];
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = e.target.value;
    setForm((current) => ({
      ...current,
      [field]: transformer ? transformer(raw) : raw,
    }));
  };
  return [value, onChange];
}
