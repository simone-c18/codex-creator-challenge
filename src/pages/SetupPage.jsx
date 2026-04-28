import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useInterview } from "../context/InterviewContext";
import { generateInterviewQuestions } from "../lib/groq";

const interviewTypes = ["Behavioral", "Technical", "HR / Culture Fit"];

const personas = [
  {
    label: "Friendly Startup",
    description: "Conversational, collaborative, culture-focused",
  },
  {
    label: "Tough FAANG",
    description: "Direct, rigorous, expects precise answers",
  },
  {
    label: "HR Generalist",
    description: "Process-oriented, values-focused, by the book",
  },
  {
    label: "Executive",
    description: "Big-picture thinking, strategic, low tolerance for fluff",
  },
];

function SetupPage() {
  const navigate = useNavigate();
  const { interviewState, setInterviewState } = useInterview();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [jd, setJd] = useState("");
  const [interviewType, setInterviewType] = useState(
    interviewState.interviewType || "Behavioral",
  );
  const [persona, setPersona] = useState(
    interviewState.persona || "Friendly Startup",
  );
  const [permissionStatus, setPermissionStatus] = useState("idle");
  const [permissionError, setPermissionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const jdIsValid = jd.trim().length > 0;
  const canStart = jdIsValid && permissionStatus === "granted" && !loading;

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const requestMediaPermissions = async () => {
    cleanupStream();
    setPermissionError("");
    setPermissionStatus("idle");

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus("denied");
      setPermissionError(
        "This browser does not support camera and microphone access.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setPermissionStatus("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setPermissionStatus("denied");
      setPermissionError(
        error?.message ||
          "Camera and microphone access is required to begin the interview.",
      );
    }
  };

  useEffect(() => {
    requestMediaPermissions();

    return () => {
      cleanupStream();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canStart) {
      return;
    }

    setSubmitError("");
    setLoading(true);

    try {
      const questions = await generateInterviewQuestions({
        jd,
        interviewType,
        persona,
      });

      setInterviewState({
        questions,
        interviewType,
        persona,
        transcriptEntries: [],
        videoBlobUrl: null,
        report: null,
      });
      navigate("/interview");
    } catch (error) {
      setSubmitError(
        error?.message || "Unable to generate questions right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      eyebrow="Setup"
      title="Build your next interview session"
      description="Paste the target job description, choose the interview style and interviewer persona, then confirm camera and mic access before Groq generates a tailored seven-question mock."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-ink/10 bg-mist p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                    01. Job Description Input
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-ink">
                    Paste the target role details
                  </h3>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Required
                </div>
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-ink/80">
                  Paste Job Description
                </span>
                <textarea
                  rows={6}
                  value={jd}
                  onChange={(event) => setJd(event.target.value)}
                  placeholder="Paste the full job description here…"
                  className="min-h-40 w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-teal"
                />
              </label>
            </section>

            <section className="rounded-[1.75rem] border border-ink/10 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
                02. Interview Type Selector
              </p>
              <h3 className="mt-2 text-2xl font-bold text-ink">
                Choose the lens for your mock
              </h3>
              <div className="mt-5 flex flex-wrap gap-3">
                {interviewTypes.map((type) => {
                  const selected = interviewType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={[
                        "rounded-full px-5 py-3 text-sm font-semibold transition",
                        selected
                          ? "bg-ink text-white shadow-lg shadow-ink/20"
                          : "border border-ink/10 bg-mist text-ink/75 hover:bg-white",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-ink/10 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coral">
                03. Persona Picker
              </p>
              <h3 className="mt-2 text-2xl font-bold text-ink">
                Pick the interviewer vibe
              </h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {personas.map((entry) => {
                  const selected = persona === entry.label;

                  return (
                    <button
                      key={entry.label}
                      type="button"
                      onClick={() => setPersona(entry.label)}
                      className={[
                        "rounded-[1.5rem] border p-5 text-left transition",
                        selected
                          ? "border-coral bg-coral/10 shadow-lg shadow-coral/10"
                          : "border-ink/10 bg-mist hover:border-teal/40 hover:bg-white",
                      ].join(" ")}
                    >
                      <p className="text-lg font-bold text-ink">{entry.label}</p>
                      <p className="mt-2 text-sm leading-7 text-ink/70">
                        {entry.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-ink/10 bg-ink p-5 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                04. Camera & Mic Permission Flow
              </p>
              <h3 className="mt-2 text-2xl font-bold">
                Confirm your interview setup
              </h3>
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10">
                {permissionStatus === "granted" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full -scale-x-100 object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-7 text-white/70">
                    {permissionStatus === "denied"
                      ? "Camera preview unavailable until permission is granted."
                      : "Requesting access to your camera and microphone..."}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  Permission status
                </p>
                <p className="mt-2 text-base font-semibold">
                  {permissionStatus === "granted"
                    ? "Granted"
                    : permissionStatus === "denied"
                      ? "Denied"
                      : "Waiting for approval"}
                </p>
                <p className="mt-2 text-sm leading-7 text-white/75">
                  We need both video and audio access before the interview can begin.
                </p>
              </div>

              {permissionStatus === "denied" ? (
                <div className="mt-4 rounded-[1.25rem] border border-coral/30 bg-coral/15 p-4 text-sm text-white">
                  <p className="font-semibold">Permission denied</p>
                  <p className="mt-2 leading-7 text-white/80">
                    {permissionError}
                  </p>
                  <button
                    type="button"
                    onClick={requestMediaPermissions}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist"
                  >
                    Retry permissions
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-[1.75rem] border border-ink/10 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
                Session summary
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.25rem] bg-mist p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Interview type
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">
                    {interviewType}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-mist p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Persona
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">{persona}</p>
                </div>
                <div className="rounded-[1.25rem] bg-mist p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Job description
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">
                    {jdIsValid ? "Ready" : "Waiting for input"}
                  </p>
                </div>
              </div>

              {submitError ? (
                <p className="mt-4 rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canStart}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-coral/50"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating your interview…
                  </>
                ) : (
                  "Start Interview"
                )}
              </button>
              <p className="mt-3 text-sm leading-7 text-ink/60">
                The button unlocks once the job description is filled in and camera
                plus mic access are granted.
              </p>
            </section>
          </div>
        </div>
      </form>
    </PageShell>
  );
}

export default SetupPage;
