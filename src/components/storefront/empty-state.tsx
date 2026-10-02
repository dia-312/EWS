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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
      <p className="text-lg font-bold">{title}</p>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
