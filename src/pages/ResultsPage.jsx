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
    frameSummary,
    roleTitle,
    jd,
    currentSessionSaved,
  } = interviewState;
  const [openCard, setOpenCard] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);
  const saveStartedRef = useRef(false);

  const logResults = (event, payload = {}) => {
    console.log(`[Results] ${event}`, payload);
  };

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
        logResults("saveSession:start", {
          uid: currentUser.uid,
          roleTitle:
            roleTitle ||
            jd
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) ||
            "Untitled Role",
          transcriptCount: transcriptEntries.length,
          questionCount: questions.length,
        });
        await addDoc(collection(db, "sessions"), {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          createdAtClient: Date.now(),
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
        logResults("saveSession:success", {
          uid: currentUser.uid,
          overallGrade: report.overall_grade,
        });

        if (!cancelled) {
          setInterviewState((current) => ({
            ...current,
            currentSessionSaved: true,
          }));
          toast.success("Session saved successfully");
        }
      } catch (error) {
        logResults("saveSession:error", {
          uid: currentUser.uid,
          message: error?.message,
          code: error?.code,
          name: error?.name,
        });
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
      <div className="space-y-5 xl:flex xl:h-[calc(100svh-15.5rem)] xl:min-h-0 xl:flex-col xl:overflow-hidden">
        <div
          ref={reportRef}
          className="space-y-5 xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[0.78fr_1.22fr] xl:gap-5 xl:space-y-0 xl:overflow-hidden"
        >
          <div className="space-y-5 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
            <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 text-center shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
                Section 1 — Grade & Summary
              </p>
              <p className={`mt-4 font-display text-6xl font-semibold sm:text-7xl ${gradeColor}`}>
                {report.overall_grade}
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-ink/75 sm:text-lg sm:leading-8">
                {report.summary}
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                Section 2 — Radar Chart
              </p>
              <Suspense fallback={<ChartLoadingCard message="Loading results chart…" />}>
                <ResultsRadarChart scoreData={scoreData} />
              </Suspense>
            </section>

            {frameSummary ? (
              <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                  Camera Presence
                </p>
                <div className="mt-5 flex gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-ink">{frameSummary.good_percentage}%</p>
                    <p className="mt-1 text-xs text-ink/50">Time in frame</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-ink">{frameSummary.away_seconds}s</p>
                    <p className="mt-1 text-xs text-ink/50">Time away</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink/65">{frameSummary.summary}</p>
              </section>
            ) : null}

            {videoBlobUrl ? (
              <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-panel">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
                  Session video
                </p>
                <video
                  src={videoBlobUrl}
                  controls
                  className="mt-4 aspect-video w-full rounded-[1.25rem] bg-ink"
                />
              </section>
            ) : null}
          </div>

          <div className="space-y-5 xl:min-h-0 xl:overflow-hidden">
            <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6 xl:flex xl:min-h-0 xl:flex-col">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                Section 3 — Annotated Transcript
              </p>
              <div className="mt-6 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                {transcriptEntries.map((entry, index) => {
                  const matchingAnnotations =
                    report.annotations?.filter(
                      (annotation) => annotation.answer_index === index,
                    ) || [];

                  return (
                    <div key={`${entry.question_id}-${index}`} className="rounded-[1.5rem] bg-mist p-4 sm:p-5">
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
            </section>

            <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6 xl:flex xl:min-h-0 xl:flex-col">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                Section 4 — Question Breakdown
              </p>
              <div className="mt-6 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                {report.question_feedback?.map((item, index) => {
                  const isOpen = openCard === index;
                  const matchingQuestion = questions.find((question) => question.id === item.question_id);
                  const resumeReference = matchingQuestion?.resume_reference;

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
                          {resumeReference && item.resume_used === false ? (
                            <div className="mt-4 rounded-[1.25rem] bg-gold/20 px-4 py-3 text-sm text-amber-700">
                              ⚠ You didn't draw on your experience with {resumeReference} — consider referencing this in a retake.
                            </div>
                          ) : null}
                          {resumeReference && item.resume_used === true ? (
                            <div className="mt-4 rounded-[1.25rem] bg-teal/10 px-4 py-3 text-sm text-teal">
                              ✓ Good — you effectively referenced your background here.
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-teal/50"
          >
            {exporting ? "Exporting…" : "Download Report"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default ResultsPage;
