import Link from "next/link";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  primaryAction?: { label: string; href: string };
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  items,
  primaryAction,
}: ModulePlaceholderProps) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 sm:px-6 md:py-10 md:pb-10">
      <header>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{description}</p>
      </header>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">基础模块已就绪</h2>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            MVP
          </span>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6"
            >
              {item}
            </li>
          ))}
        </ul>
        {primaryAction ? (
          <Link
            href={primaryAction.href}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            {primaryAction.label}
          </Link>
        ) : null}
      </section>
    </main>
  );
}
