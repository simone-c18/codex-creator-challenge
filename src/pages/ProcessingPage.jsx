import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useInterview } from "../context/InterviewContext";
import { generateContent } from "../lib/groq";

const stepItems = [
  { label: "Reviewing your answers…", delay: 300 },
  { label: "Analyzing communication patterns…", delay: 300 },
  { label: "Building your report…", delay: 0 },
];

function ProcessingPage() {
  const navigate = useNavigate();
  const { interviewState, setInterviewState } = useInterview();
  const {
    transcriptEntries = [],
    questions = [],
    interviewType,
    persona,
    report,
    resumeText,
  } = interviewState;
  const [activeStep, setActiveStep] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const runStartedRef = useRef(false);

  const answeredQuestions = useMemo(
    () => transcriptEntries.filter((entry) => entry.answer?.trim()),
    [transcriptEntries],
  );

  const buildReport = async () => {
    if (loadingReport) {
      return;
    }

    setError("");
    setLoadingReport(true);

    const systemPrompt = `You are an expert interview coach grading a candidate's mock interview performance.

Persona tone:
- Friendly Startup: warm and encouraging in your feedback tone
- Tough FAANG: direct and unsparing — high standards, specific critique
- HR Generalist: professional and structured feedback focused on culture fit
- Executive: strategic feedback focused on big-picture communication

Return ONLY a valid JSON object — no markdown, no backticks:
{
  "overall_grade": "A" | "B" | "C" | "D" | "F",
  "summary": string,
  "scores": {
    "communication": number,
    "technical_depth": number,
    "confidence": number,
    "conciseness": number,
    "relevance": number
  },
  "annotations": [
    {
      "answer_index": number,
      "type": "positive" | "warning" | "info",
      "comment": string
    }
  ],
  "question_feedback": [
    {
      "question_id": number,
      "question": string,
      "answer": string,
      "grade": "A" | "B" | "C" | "D" | "F",
      "feedback": string,
      "resume_used": boolean
    }
  ]
}

Rules:
- summary must be exactly 1 sentence written as a coach speaking directly to the candidate
- All scores are 0–100
- annotations must cover at least 3 moments across the transcript
- type "positive" = something done well, "warning" = something to improve, "info" = neutral observation
- question_feedback must have one entry per question answered
- If a resume was provided, note in question_feedback whether the candidate successfully drew on the specific experience referenced. Add a "resume_used": true | false field to each question_feedback entry indicating whether the candidate actually referenced the resume point in their answer.
- Be specific — reference actual words or phrases from the candidate's answers`;

    const userPrompt = `Interview Type: ${interviewType}
Persona: ${persona}

${resumeText ? `Candidate Resume:\n${resumeText}\n` : ""}

Full Transcript:
${JSON.stringify(transcriptEntries, null, 2)}

Question Intents:
${JSON.stringify(
  questions.map((q) => ({
    id: q.id,
    intent: q.intent,
    resume_reference: q.resume_reference,
  })),
  null,
  2,
)}`;

    try {
      const text = await generateContent(systemPrompt, userPrompt, {
        maxTokens: 1800,
      });
      const parsed = JSON.parse(text);

      setInterviewState((current) => ({
        ...current,
        report: parsed,
      }));
      navigate("/results");
    } catch (reportError) {
      toast.error(reportError.message || "Unable to build your report right now.");
      setError(reportError.message || "Unable to build your report right now.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!answeredQuestions.length || report) {
      return undefined;
    }

    if (runStartedRef.current) {
      return undefined;
    }

    runStartedRef.current = true;

    let cancelled = false;
    let timeoutId;

    const runSteps = async () => {
      for (let index = 0; index < stepItems.length; index += 1) {
        if (cancelled) {
          return;
        }

        setActiveStep(index);

        if (index < stepItems.length - 1) {
          await new Promise((resolve) => {
            timeoutId = window.setTimeout(resolve, stepItems[index].delay);
          });
        } else {
          await buildReport();
        }
      }
    };

    runSteps();

    return () => {
      cancelled = true;
      runStartedRef.current = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [answeredQuestions.length, report]);

  if (!answeredQuestions.length) {
    return <Navigate to="/interview" replace />;
  }

  if (report) {
    return <Navigate to="/results" replace />;
  }

  return (
    <PageShell
      eyebrow="Processing"
      title="Turning your interview into a usable coaching report"
      description="We’re moving through the same flow a real coach would use: reviewing your answers, spotting patterns, and shaping a report you can actually act on."
    >
      <div className="grid gap-5 xl:h-[calc(100svh-15.5rem)] xl:grid-cols-[0.88fr_1.12fr] xl:overflow-hidden">
        <section className="rounded-[1.5rem] border border-ink/10 bg-ink p-5 text-white shadow-panel sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Analysis engine
          </p>
          <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
            Building your interview review
          </h3>
          <div className="mt-8 space-y-6">
            {stepItems.map((step, index) => {
              const isComplete = index < activeStep;
              const isActive = index === activeStep;

              return (
                <div key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center rounded-full border text-sm font-bold transition",
                        isComplete
                          ? "border-teal bg-teal text-white"
                          : isActive
                            ? "border-gold bg-gold text-ink"
                            : "border-white/20 bg-white/10 text-white/60",
                      ].join(" ")}
                    >
                      0{index + 1}
                    </div>
                    {index < stepItems.length - 1 ? (
                      <div className="mt-2 h-12 w-px bg-white/15" />
                    ) : null}
                  </div>
                  <div className="pt-2">
                    <p className="text-base font-semibold">{step.label}</p>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      {isComplete
                        ? "Complete"
                        : isActive
                          ? "In progress"
                          : "Queued"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6 xl:min-h-0 xl:overflow-y-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
            Session snapshot
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Interview type
              </p>
              <p className="mt-2 text-base font-semibold text-ink">{interviewType}</p>
            </div>
            <div className="rounded-[1.5rem] bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Persona
              </p>
              <p className="mt-2 text-base font-semibold text-ink">{persona}</p>
            </div>
            <div className="rounded-[1.5rem] bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Answers captured
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {answeredQuestions.length}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Report status
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {loadingReport ? "Generating" : error ? "Needs retry" : "Queued"}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.5rem] border border-coral/20 bg-coral/10 p-5">
              <p className="text-base font-semibold text-coral">
                We couldn’t finish building your report.
              </p>
              <p className="mt-2 text-sm leading-7 text-coral">
                {error}
              </p>
              <button
                type="button"
                onClick={buildReport}
                disabled={loadingReport}
                className="mt-4 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-coral/50"
              >
                {loadingReport ? "Retrying…" : "Retry report generation"}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-ink/15 bg-white p-5">
              <p className="text-base leading-8 text-ink/70">
                Stay here for a moment while we convert the raw transcript into a
                coach-style performance report with grades, notes, and per-question feedback.
              </p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export default ProcessingPage;
