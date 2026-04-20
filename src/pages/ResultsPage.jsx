import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const feedbackItems = [
  {
    title: "Strongest answer",
    body: "You communicated ownership clearly and used metrics to show impact.",
  },
  {
    title: "Needs work",
    body: "Add more concise framing before diving into implementation details.",
  },
  {
    title: "Next practice goal",
    body: "Prepare two sharper cross-functional leadership stories for follow-up rounds.",
  },
];

function ResultsPage() {
  return (
    <PageShell
      eyebrow="Results"
      title="Review the coaching summary"
      description="Use this placeholder results page to display strengths, improvement opportunities, scorecards, and action plans after each practice session."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {feedbackItems.map((item) => (
          <div
            key={item.title}
            className="rounded-[1.5rem] border border-ink/10 bg-white p-5"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
              {item.title}
            </p>
            <p className="mt-3 text-base leading-8 text-ink/75">{item.body}</p>
          </div>
        ))}
      </div>

      <Link
        to="/dashboard"
        className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
      >
        Back to dashboard
      </Link>
    </PageShell>
  );
}

export default ResultsPage;
