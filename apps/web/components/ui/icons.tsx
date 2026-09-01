type IconProps = { className?: string; "aria-hidden"?: boolean };

export function LogoMark({ className = "h-7 w-7" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="6" className="fill-accent" />
      <path
        d="M8 11.5C8 10.12 9.12 9 10.5 9h11C22.88 9 24 10.12 24 11.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C9.12 23 8 21.88 8 20.5v-9Z"
        className="fill-accent-fg"
        fillOpacity="0.15"
      />
      <path
        d="M14 13.5l6 3.5-6 3.5v-7Z"
        className="fill-accent-fg"
      />
    </svg>
  );
}

export function IconServer({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconVideo({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLock({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconUsers({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
      <path d="M17 8.5a3 3 0 1 1 0 6" />
      <path d="M22 20c0-2.8-2.24-5-5-5" />
    </svg>
  );
}

export function IconShield({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3l8 3v6c0 5.25-3.5 9.5-8 10.5-4.5-1-8-5.25-8-10.5V6l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRoom({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10.5 12 5l8 5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5Z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
