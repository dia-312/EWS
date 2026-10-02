"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState, but the form is submitted from onSubmit instead of the
 * `action` prop. React 19 resets every uncontrolled field after a form `action`
 * finishes, even when the server answered with a validation error, which wipes
 * what the user typed. Submitting through onSubmit keeps the fields as they are.
 *
 * It also lets a field's server error disappear as soon as the user edits that
 * field: put `onInput` on the <form> and ask `isDismissed(field)` before showing
 * an error. A new server response brings its errors back.
 */
export function useActionForm<State extends object>(
  action: (previous: State, formData: FormData) => Promise<State>,
  initialState: State,
) {
  // State is always a plain object (never a promise), so Awaited<State> is State.
  const [state, dispatch, pending] = useActionState<State, FormData>(
    action as (previous: Awaited<State>, formData: FormData) => Promise<State>,
    initialState as Awaited<State>,
  );
  const [, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<{ result: State; fields: string[] }>({
    result: state,
    fields: [],
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  /** Repeated inputs (spec rows, opening hours) share one error key. */
  function errorKey(name: string) {
    if (name.startsWith("spec_")) return "specs";
    if (name.startsWith("hours_")) return "working_hours";
    return name;
  }

  function onInput(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name;
    if (!name) return;
    const field = errorKey(name);
    setDismissed((current) => {
      const fields = current.result === state ? current.fields : [];
      return fields.includes(field) ? current : { result: state, fields: [...fields, field] };
    });
  }

  const isDismissed = (field: string) => dismissed.result === state && dismissed.fields.includes(field);

  return { state, onSubmit, onInput, isDismissed, pending };
}
