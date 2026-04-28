import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import PageShell from "../components/PageShell";
import { useInterview } from "../context/InterviewContext";

function ResultsPage() {
  const { interviewState } = useInterview();
  const { report, transcriptEntries = [], videoBlobUrl } = interviewState;
  const [openCard, setOpenCard] = useState(null);

  const scoreData = useMemo(() => {
    if (!report?.scores) {
      return [];
    }

    return [
      { subject: "Communication", value: report.scores.communication },
      { subject: "Technical Depth", value: report.scores.technical_depth },
      { subject: "Confidence", value: report.scores.confidence },
      { subject: "Conciseness", value: report.scores.conciseness },
      { subject: "Relevance", value: report.scores.relevance },
    ];
  }, [report]);

  if (!report) {
    return <Navigate to="/processing" replace />;
  }

  const gradeColor =
    report.overall_grade === "A"
      ? "text-teal"
      : report.overall_grade === "B"
        ? "text-teal"
        : report.overall_grade === "C"
          ? "text-gold"
          : "text-coral";

  const annotationStyles = {
    positive: "bg-teal/10 text-teal",
    warning: "bg-gold/20 text-amber-700",
    info: "bg-sky-100 text-sky-700",
  };

  return (
    <PageShell
      eyebrow="Results"
      title="Review the coaching report"
      description="This report blends overall scoring, transcript annotations, and question-level critique so you can see both the pattern and the detail."
    >
      <section className="rounded-[1.75rem] border border-ink/10 bg-white p-6 text-center shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
          Section 1 — Grade & Summary
        </p>
        <p className={`mt-5 font-display text-7xl font-semibold ${gradeColor}`}>
          {report.overall_grade}
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          {report.summary}
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
          Section 2 — Radar Chart
        </p>
        <div className="mt-6 h-[340px] w-full rounded-[1.5rem] bg-mist p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={scoreData}>
              <PolarGrid stroke="#c8d6df" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#132238", fontSize: 12 }} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#ff7a59"
                fill="#ff7a59"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
          Section 3 — Annotated Transcript
        </p>
        <div className="mt-6 space-y-4">
          {transcriptEntries.map((entry, index) => {
            const matchingAnnotations =
              report.annotations?.filter(
                (annotation) => annotation.answer_index === index,
              ) || [];

            return (
              <div key={`${entry.question_id}-${index}`} className="rounded-[1.5rem] bg-mist p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                  {entry.is_follow_up ? "Follow-up answer" : "Answer"}
                </p>
                <p className="mt-2 text-sm leading-7 text-ink/65">{entry.question}</p>
                <p className="mt-4 text-base leading-8 text-ink/80">{entry.answer}</p>
                {matchingAnnotations.length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {matchingAnnotations.map((annotation, annotationIndex) => (
                      <div
                        key={`${annotation.type}-${annotationIndex}`}
                        className="flex items-center gap-2 rounded-full bg-white px-3 py-2"
                      >
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                            annotationStyles[annotation.type],
                          ].join(" ")}
                        >
                          {annotation.type}
                        </span>
                        <span className="text-sm text-ink/75">{annotation.comment}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {videoBlobUrl ? (
          <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-white p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
              Session video
            </p>
            <video
              src={videoBlobUrl}
              controls
              className="mt-4 aspect-video w-full rounded-[1.25rem] bg-ink"
            />
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
          Section 4 — Question Breakdown
        </p>
        <div className="mt-6 space-y-4">
          {report.question_feedback?.map((item, index) => {
            const isOpen = openCard === index;

            return (
              <div
                key={`${item.question_id}-${index}`}
                className="overflow-hidden rounded-[1.5rem] border border-ink/10 bg-mist"
              >
                <button
                  type="button"
                  onClick={() => setOpenCard(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                      Grade {item.grade}
                    </p>
                    <p className="mt-2 text-base font-semibold leading-7 text-ink">
                      {item.question}
                    </p>
                  </div>
                  <span className="text-2xl font-light text-ink/50">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-ink/10 bg-white px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                      Your answer
                    </p>
                    <p className="mt-2 text-base leading-8 text-ink/75">{item.answer}</p>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                      Feedback
                    </p>
                    <p className="mt-2 text-base leading-8 text-ink/75">{item.feedback}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

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
