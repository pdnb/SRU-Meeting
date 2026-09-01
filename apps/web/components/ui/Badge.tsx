type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent";

const variantClass: Record<BadgeVariant, string> = {
  default: "sru-badge",
  success: "sru-badge sru-badge-success",
  warning: "sru-badge sru-badge-warning",
  danger: "sru-badge sru-badge-danger",
  accent: "sru-badge sru-badge-accent",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return <span className={variantClass[variant]}>{children}</span>;
}
