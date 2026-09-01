"use client";

import type { ButtonHTMLAttributes, ReactElement } from "react";

export function ControlIconButton({
  label,
  pressed,
  danger,
  children,
  className = "",
  ...props
}: {
  label: string;
  pressed?: boolean;
  danger?: boolean;
  children: ReactElement;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  const tone = danger
    ? "bg-[#c4314b] text-white hover:bg-[#a82a40]"
    : pressed
      ? "bg-meet-speaker text-black hover:bg-[#00a9d4]"
      : "bg-meet-raised text-meet-ink hover:bg-[#3a3a3a]";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`inline-grid shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        /\bh-/.test(className) ? "" : "h-10 w-10"
      } ${tone} ${className}`}
      {...props}
    >
      {children as never}
    </button>
  );
}
