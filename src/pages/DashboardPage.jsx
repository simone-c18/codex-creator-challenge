import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
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

function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setInterviewState } = useInterview();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    let cancelled = false;

    const fetchSessions = async () => {
      setLoading(true);

      try {
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(sessionsQuery);
        const nextSessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!cancelled) {
          setSessions(nextSessions);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || "Unable to load past sessions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

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
    setInterviewState({
      jd: session.jd || "",
      roleTitle: session.roleTitle || "",
      questions: session.questions || [],
      interviewType: session.interviewType || "Behavioral",
      persona: session.persona || "Friendly Startup",
      transcriptEntries: [],
      videoBlobUrl: null,
      report: null,
      currentSessionSaved: false,
    });
    navigate("/setup");
  };

  return (
    <PageShell
      eyebrow="Dashboard"
      title="Welcome back to your coaching workspace"
      description="Review how your interviews are trending, jump into another retake, and compare your recent sessions without losing the thread of your progress."
      nextTo="/setup"
      nextLabel="Start Setup"
    >
      <section className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
          Past sessions
        </p>
        {loading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[1.5rem] border border-ink/10 bg-mist p-5"
              >
                <div className="h-4 w-24 rounded bg-white" />
                <div className="mt-4 h-7 w-3/4 rounded bg-white" />
                <div className="mt-3 h-4 w-1/2 rounded bg-white" />
                <div className="mt-6 h-11 w-28 rounded-full bg-white" />
              </div>
            ))}
          </div>
        ) : sessions.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                    <h3 className="mt-3 text-2xl font-bold text-ink">
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

      <section className="mt-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
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
    </PageShell>
  );
}

export default DashboardPage;
