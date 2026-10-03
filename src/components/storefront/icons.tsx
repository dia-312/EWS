type IconProps = { className?: string; filled?: boolean };

/** Decorative icons: they always sit next to (or inside) a button with an accessible name. */
export function HeartIcon({ className = "size-5", filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.4 3.3 5 6.6 5c2 0 3.5 1.1 5.4 3.2C13.9 6.1 15.4 5 17.4 5c3.3 0 5.4 3.4 4.1 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function CompareIcon({ className = "size-5", filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={filled ? 2.6 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4v16M3 8l4-4 4 4" />
      <path d="M17 20V4M13 16l4 4 4-4" />
    </svg>
  );
}
