export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-ink sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-ink/65 sm:text-lg">{description}</p>
    </div>
  );
}
