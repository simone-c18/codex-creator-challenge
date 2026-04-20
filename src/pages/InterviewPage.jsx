import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";

const promptCards = [
  "Tell me about a time you handled a difficult stakeholder conversation.",
  "How would you prioritize conflicting roadmap requests this quarter?",
  "What metrics would you use to evaluate launch success?",
];

function InterviewPage() {
  const navigate = useNavigate();

  return (
    <PageShell
      eyebrow="Interview"
      title="Run the mock interview experience"
      description="This placeholder page represents the live interview interface. In a full version, this is where prompts, recording, transcription, and AI facilitation would live."
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-ink/10 bg-mist p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
            Sample prompts
          </p>
          <div className="mt-4 space-y-3">
            {promptCards.map((prompt, index) => (
              <div
                key={prompt}
                className="rounded-[1.25rem] bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                  Question {index + 1}
                </p>
                <p className="mt-2 text-base leading-7 text-ink/80">{prompt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-ink/10 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
            Session controls
          </p>
          <p className="mt-3 text-base leading-8 text-ink/70">
            Use this placeholder state to simulate the end of an interview and move
            into feedback generation.
          </p>
          <button
            type="button"
            onClick={() => navigate("/processing")}
            className="mt-6 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Finish Interview
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default InterviewPage;
