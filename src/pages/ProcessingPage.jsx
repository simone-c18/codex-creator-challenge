import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";

function ProcessingPage() {
  const navigate = useNavigate();

  return (
    <PageShell
      eyebrow="Processing"
      title="Generate structured coaching feedback"
      description="This page stands in for transcript analysis, answer scoring, strength detection, and personalized follow-up suggestions while the interview is being processed."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Transcribing session audio",
          "Evaluating answer quality",
          "Drafting coaching recommendations",
        ].map((step, index) => (
          <div
            key={step}
            className="rounded-[1.5rem] border border-ink/10 bg-mist p-5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-teal shadow-sm">
              0{index + 1}
            </div>
            <p className="mt-4 text-base font-semibold text-ink">{step}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/results")}
        className="mt-8 rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90"
      >
        View Results
      </button>
    </PageShell>
  );
}

export default ProcessingPage;
