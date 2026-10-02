"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState, but the form is submitted from onSubmit instead of the
 * `action` prop. React 19 resets every uncontrolled field after a form `action`
 * finishes, even when the server answered with a validation error, which wipes
 * what the user typed. Submitting through onSubmit keeps the fields as they are.
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending };
}
