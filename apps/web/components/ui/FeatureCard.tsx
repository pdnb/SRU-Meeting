export function FeatureCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="sru-card sru-card-interactive flex flex-col gap-3 p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-sru bg-accent/10 text-accent">
        {children}
      </div>
      <h3 className="text-title font-semibold text-ink">{title}</h3>
      <p className="text-body text-muted">{description}</p>
    </article>
  );
}
