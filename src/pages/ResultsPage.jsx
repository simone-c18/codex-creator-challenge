import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import ChartLoadingCard from "../components/ChartLoadingCard";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";
import { useInterview } from "../context/InterviewContext";
import { db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const ResultsRadarChart = lazy(() => import("../components/ResultsRadarChart"));

function ResultsPage() {
  const { currentUser } = useAuth();
  const { interviewState, setInterviewState } = useInterview();
  const {
    report,
    transcriptEntries = [],
    videoBlobUrl,
    questions = [],
    interviewType,
    persona,
    roleTitle,
    jd,
    currentSessionSaved,
  } = interviewState;
  const [openCard, setOpenCard] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);
  const saveStartedRef = useRef(false);

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

  useEffect(() => {
    if (!currentUser?.uid || currentSessionSaved || !report) {
      return;
    }

    if (saveStartedRef.current) {
      return;
    }

    saveStartedRef.current = true;

    let cancelled = false;

    const saveSession = async () => {
      try {
        await addDoc(collection(db, "sessions"), {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          roleTitle:
            roleTitle ||
            jd
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) ||
            "Untitled Role",
          interviewType,
          overall_grade: report.overall_grade,
          scores: report.scores,
          transcript: transcriptEntries,
          report,
          persona,
          questions,
          jd,
        });

        if (!cancelled) {
          setInterviewState((current) => ({
            ...current,
            currentSessionSaved: true,
          }));
          toast.success("Session saved successfully");
        }
      } catch (error) {
        if (!cancelled) {
          saveStartedRef.current = false;
          toast.error(error?.message || "Unable to save session.");
        }
      }
    };

    saveSession();

    return () => {
      cancelled = true;
    };
  }, [
    currentSessionSaved,
    currentUser?.uid,
    interviewType,
    jd,
    persona,
    questions,
    report,
    roleTitle,
    setInterviewState,
    transcriptEntries,
  ]);

  const handleExport = async () => {
    if (!reportRef.current || exporting) {
      return;
    }

    setExporting(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#f7fbfc",
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "p",
        unit: "px",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight);
      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`interview-report-${today}.pdf`);
      toast.success("PDF export complete");
    } catch (error) {
      toast.error(error?.message || "Unable to export PDF.");
    } finally {
      setExporting(false);
    }
  };

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
      <div ref={reportRef}>
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
        <Suspense fallback={<ChartLoadingCard message="Loading results chart…" />}>
          <ResultsRadarChart scoreData={scoreData} />
        </Suspense>
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
      </div>

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
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="ml-3 mt-8 inline-flex rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-teal/50"
      >
        {exporting ? "Exporting…" : "Download Report"}
      </button>
    </PageShell>
  );
}

export default ResultsPage;
