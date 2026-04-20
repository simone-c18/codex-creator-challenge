import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const sessionCards = [
  {
    title: "Last session",
    value: "Product Manager mock",
    detail: "Behavioral + strategy blend",
  },
  {
    title: "Readiness score",
    value: "82%",
    detail: "Up 9% from last practice set",
  },
  {
    title: "Next action",
    value: "Refine STAR stories",
    detail: "Focus on metrics and ownership",
  },
];

function DashboardPage() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title="Welcome back to your coaching workspace"
      description="Track your practice momentum, jump back into interview prep, and follow the guided route flow through setup, mock interview, processing, and final feedback."
      nextTo="/setup"
      nextLabel="Start Setup"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {sessionCards.map((card) => (
          <div
            key={card.title}
            className="rounded-[1.5rem] border border-ink/10 bg-mist p-5"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
              {card.title}
            </p>
            <h3 className="mt-3 text-2xl font-bold text-ink">{card.value}</h3>
            <p className="mt-2 text-sm leading-7 text-ink/65">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-dashed border-ink/15 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
          Route flow
        </p>
        <p className="mt-3 text-base leading-8 text-ink/75">
          Use the guided experience in order:
          <span className="font-semibold text-ink"> Setup </span>
          → <span className="font-semibold text-ink">Interview</span> →
          <span className="font-semibold text-ink"> Processing</span> →
          <span className="font-semibold text-ink"> Results</span>.
        </p>
        <Link
          to="/setup"
          className="mt-4 inline-flex rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90"
        >
          Continue to setup
        </Link>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
