export function LandingFeature({
  title,
  description,
  icon,
  className = "",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`landing-feature ${className}`.trim()}>
      <div className="landing-feature-icon">{icon}</div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{description}</p>
    </article>
  );
}
