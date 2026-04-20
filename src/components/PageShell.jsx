import { Link } from "react-router-dom";

function PageShell({ eyebrow, title, description, nextTo, nextLabel, children }) {
  return (
    <section className="animate-rise rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-panel backdrop-blur md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink/75">{description}</p>
        </div>
        {nextTo && nextLabel ? (
          <Link
            to={nextTo}
            className="inline-flex items-center justify-center rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90"
          >
            {nextLabel}
          </Link>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

export default PageShell;
