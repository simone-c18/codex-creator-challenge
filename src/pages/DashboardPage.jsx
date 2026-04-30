import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import ChartLoadingCard from "../components/ChartLoadingCard";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";
import { useInterview } from "../context/InterviewContext";
import { db } from "../lib/firebase";

const DashboardTrendChart = lazy(() => import("../components/DashboardTrendChart"));

function formatSessionDate(createdAt) {
  if (!createdAt) {
    return "Pending date";
  }

  const date =
    typeof createdAt.toDate === "function" ? createdAt.toDate() : new Date(createdAt);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSessionSortValue(session) {
  if (typeof session?.createdAt?.toMillis === "function") {
    return session.createdAt.toMillis();
  }

  if (typeof session?.createdAt?.seconds === "number") {
    return session.createdAt.seconds * 1000;
  }

  if (typeof session?.createdAtClient === "number") {
    return session.createdAtClient;
  }

  const parsed = Date.parse(session?.createdAtClient || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortSessionsByNewest(items) {
  return [...items].sort((left, right) => getSessionSortValue(right) - getSessionSortValue(left));
}

function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { interviewState, setInterviewState } = useInterview();
  const [sessions, setSessions] = useState([]);
  const [resumeProcessing, setResumeProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const logDashboard = (event, payload = {}) => {
    console.log(`[Dashboard] ${event}`, payload);
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    let cancelled = false;

    const sessionsQuery = query(
      collection(db, "sessions"),
      where("userId", "==", currentUser.uid),
    );

    const fetchSessions = async () => {
      logDashboard("fetchSessions:start", { uid: currentUser.uid, source: "cache-then-server" });

      try {
        const cachedSnapshot = await getDocsFromCache(sessionsQuery);
        const cachedSessions = cachedSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const sortedCachedSessions = sortSessionsByNewest(cachedSessions);
        logDashboard("fetchSessions:cache", {
          uid: currentUser.uid,
          count: sortedCachedSessions.length,
        });

        if (!cancelled) {
          setSessions(sortedCachedSessions);
        }
      } catch (error) {
        logDashboard("fetchSessions:cache-miss", {
          uid: currentUser.uid,
          message: error?.message,
          code: error?.code,
        });
        if (!cancelled) {
          setSessions([]);
        }
      }

      try {
        const snapshot = await getDocs(sessionsQuery);
        const nextSessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const sortedSessions = sortSessionsByNewest(nextSessions);
        logDashboard("fetchSessions:success", {
          uid: currentUser.uid,
          count: sortedSessions.length,
          ids: sortedSessions.map((session) => session.id),
        });

        if (!cancelled) {
          setSessions(sortedSessions);
        }
      } catch (error) {
        logDashboard("fetchSessions:error", {
          uid: currentUser.uid,
          message: error?.message,
          code: error?.code,
          name: error?.name,
        });
        toast.error(error?.message || "Unable to refresh past sessions.");
      }
    };

    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    let cancelled = false;

    const fetchResume = async () => {
      logDashboard("fetchResume:start", { uid: currentUser.uid, source: "cache-then-server" });

      try {
        const cachedUserDoc = await getDocFromCache(doc(db, "users", currentUser.uid));
        const cachedData = cachedUserDoc.exists() ? cachedUserDoc.data() : {};
        logDashboard("fetchResume:cache", {
          uid: currentUser.uid,
          exists: cachedUserDoc.exists(),
          hasResumeText: Boolean(cachedData?.resumeText),
          resumeFilename: cachedData?.resumeFilename || null,
        });

        if (!cancelled) {
          setInterviewState((current) => ({
            ...current,
            resumeText: cachedData?.resumeText || "",
            resumeFilename: cachedData?.resumeFilename || "",
          }));
        }
      } catch (error) {
        logDashboard("fetchResume:cache-miss", {
          uid: currentUser.uid,
          message: error?.message,
          code: error?.code,
        });
        if (!cancelled) {
          setInterviewState((current) => ({
            ...current,
            resumeText: "",
            resumeFilename: "",
          }));
        }
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const data = userDoc.exists() ? userDoc.data() : {};
        logDashboard("fetchResume:success", {
          uid: currentUser.uid,
          exists: userDoc.exists(),
          hasResumeText: Boolean(data?.resumeText),
          resumeFilename: data?.resumeFilename || null,
        });

        if (!cancelled) {
          setInterviewState((current) => ({
            ...current,
            resumeText: data?.resumeText || "",
            resumeFilename: data?.resumeFilename || "",
          }));
        }
      } catch (error) {
        logDashboard("fetchResume:error", {
          uid: currentUser.uid,
          message: error?.message,
          code: error?.code,
          name: error?.name,
        });
        toast.error(error?.message || "Unable to refresh your saved resume.");
      }
    };

    fetchResume();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, setInterviewState]);

  const comparisonData = useMemo(() => {
    return sessions.slice(0, 3).map((session) => ({
      label: formatSessionDate(session.createdAt),
      values: [
        { subject: "Communication", value: session.scores?.communication ?? 0 },
        { subject: "Technical Depth", value: session.scores?.technical_depth ?? 0 },
        { subject: "Confidence", value: session.scores?.confidence ?? 0 },
        { subject: "Conciseness", value: session.scores?.conciseness ?? 0 },
        { subject: "Relevance", value: session.scores?.relevance ?? 0 },
      ],
    }));
  }, [sessions]);

  const chartBase = useMemo(() => {
    const axes = [
      "Communication",
      "Technical Depth",
      "Confidence",
      "Conciseness",
      "Relevance",
    ];

    return axes.map((subject, index) => {
      const row = { subject };
      comparisonData.forEach((session, sessionIndex) => {
        row[`session${sessionIndex}`] = session.values[index].value;
      });
      return row;
    });
  }, [comparisonData]);

  const gradeColor = (grade) => {
    if (grade === "A") return "text-teal";
    if (grade === "B") return "text-teal";
    if (grade === "C") return "text-gold";
    return "text-coral";
  };

  const handleRetake = (session) => {
    setInterviewState((current) => ({
      ...current,
      jd: session.jd || "",
      roleTitle: session.roleTitle || "",
      questions: session.questions || [],
      interviewType: session.interviewType || "Behavioral",
      persona: session.persona || "Friendly Startup",
      transcriptEntries: [],
      videoBlobUrl: null,
      report: null,
      currentSessionSaved: false,
    }));
    navigate("/setup");
  };

  const handleResumeSelection = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser?.uid) {
      return;
    }

    setResumeProcessing(true);
    logDashboard("resumeUpload:start", {
      uid: currentUser.uid,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });

    try {
      const { parsePdfToText } = await import("../utils/parsePdf");
      const resumeText = await parsePdfToText(file);
      logDashboard("resumeUpload:parsed", {
        uid: currentUser.uid,
        fileName: file.name,
        textLength: resumeText.length,
      });
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          resumeText,
          resumeFilename: file.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      logDashboard("resumeUpload:saved", {
        uid: currentUser.uid,
        fileName: file.name,
      });

      setInterviewState((current) => ({
        ...current,
        resumeText,
        resumeFilename: file.name,
      }));
      toast.success("Resume uploaded successfully");
    } catch (error) {
      logDashboard("resumeUpload:error", {
        uid: currentUser.uid,
        fileName: file.name,
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
      toast.error(error?.message || "Unable to read your resume PDF.");
    } finally {
      setResumeProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveResume = async () => {
    if (!currentUser?.uid || resumeProcessing) {
      return;
    }

    setResumeProcessing(true);
    logDashboard("resumeRemove:start", { uid: currentUser.uid });

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          resumeText: "",
          resumeFilename: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      logDashboard("resumeRemove:saved", { uid: currentUser.uid });
      setInterviewState((current) => ({
        ...current,
        resumeText: "",
        resumeFilename: "",
      }));
      toast.success("Resume removed");
    } catch (error) {
      logDashboard("resumeRemove:error", {
        uid: currentUser.uid,
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
      toast.error(error?.message || "Unable to remove your resume.");
    } finally {
      setResumeProcessing(false);
    }
  };

  return (
    <PageShell
      eyebrow="Dashboard"
      title="Welcome back to your coaching workspace"
      description="Review how your interviews are trending, jump into another retake, and compare your recent sessions without losing the thread of your progress."
      nextTo="/setup"
      nextLabel="Start Setup"
    >
      <div className="space-y-5 xl:grid xl:h-[calc(100svh-15.5rem)] xl:grid-cols-[0.9fr_1.1fr] xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-5 xl:space-y-0">
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
            Resume Upload
          </p>
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-ink/15 bg-mist p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleResumeSelection}
            />
            {interviewState.resumeText ? (
              <div>
                <p className="text-base font-semibold text-ink">
                  Resume on file:{" "}
                  <span className="text-teal">
                    {interviewState.resumeFilename || "uploaded-resume.pdf"}
                  </span>
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={resumeProcessing}
                    className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-teal/50"
                  >
                    Update Resume
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveResume}
                    disabled={resumeProcessing}
                    className="rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-base leading-8 text-ink/72">
                  Upload your resume so the interview coach can tailor questions to
                  your actual background and experience.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={resumeProcessing}
                  className="mt-5 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-coral/50"
                >
                  Upload Resume (PDF)
                </button>
              </div>
            )}

            {resumeProcessing ? (
              <p className="mt-4 text-sm font-semibold text-teal">Reading your resume…</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6 xl:row-span-2 xl:min-h-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
            Past sessions
          </p>
          {sessions.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:max-h-full xl:grid-cols-2 xl:overflow-y-auto xl:pr-2 2xl:grid-cols-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-[1.5rem] border border-ink/10 bg-mist p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                        {formatSessionDate(session.createdAt)}
                      </p>
                      <h3 className="mt-3 text-xl font-bold text-ink sm:text-2xl">
                        {session.roleTitle}
                      </h3>
                    </div>
                    <p className={`text-3xl font-bold ${gradeColor(session.overall_grade)}`}>
                      {session.overall_grade}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                      {session.interviewType}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRetake(session)}
                    className="mt-6 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90"
                  >
                    Retake
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-ink/15 bg-mist p-6 text-center">
              <p className="text-lg font-semibold text-ink">
                No interviews yet — start your first one
              </p>
              <Link
                to="/setup"
                className="mt-5 inline-flex rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal/90"
              >
                Start your first interview
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
            Progress trend
          </p>
          {sessions.length >= 2 ? (
            <Suspense fallback={<ChartLoadingCard message="Loading trend chart…" />}>
              <DashboardTrendChart
                chartBase={chartBase}
                comparisonData={comparisonData}
              />
            </Suspense>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-ink/15 bg-mist p-6">
              <p className="text-base leading-8 text-ink/70">
                Complete 2 or more interviews to see your progress trend.
              </p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
