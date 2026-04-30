import { Link } from "react-router-dom";

function PageShell({ eyebrow, title, description, nextTo, nextLabel, children }) {
  return (
    <section className="animate-rise rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal sm:text-sm">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-ink sm:text-[2.4rem]">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink/75 sm:text-[1.05rem] sm:leading-8">
            {description}
          </p>
        </div>
        {nextTo && nextLabel ? (
          <Link
            to={nextTo}
            className="inline-flex items-center justify-center self-start rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90"
          >
            {nextLabel}
          </Link>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export default PageShell;
