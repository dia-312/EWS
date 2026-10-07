export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-gradient-to-b from-background to-primary-soft px-6 py-14 text-center">
      <span aria-hidden className="mb-2 flex size-16 items-center justify-center rounded-full bg-primary-tint text-primary ring-8 ring-primary-soft">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5M8.5 11h5" />
        </svg>
      </span>
      <p className="text-lg font-extrabold">{title}</p>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
