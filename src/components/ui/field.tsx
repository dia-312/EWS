import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary";

type CommonProps = {
  label: string;
  hint?: string;
  error?: string;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: CommonProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, { hint, error }: CommonProps) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={cn(controlClass, error ? "border-danger" : "border-border", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={cn(controlClass, error ? "border-danger" : "border-border", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  hint,
  id,
  ...props
}: Omit<CommonProps, "error"> &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 size-4 accent-primary"
        {...props}
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
