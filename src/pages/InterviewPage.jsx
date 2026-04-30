import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { loadModels, detectFace } from "../utils/frameCheck";
import { decideFollowUp } from "../lib/groqFollowUp";
import { speakWhenReady, stopSpeaking } from "../utils/tts";

function InterviewPage() {
  const navigate = useNavigate();
  const { interviewState, setInterviewState } = useInterview();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const activePromptRef = useRef("");
  const currentQuestionRef = useRef(null);
  const sessionEndedRef = useRef(false);
  const statusRef = useRef("asking");
  const processingAnswerRef = useRef(false);
  const sttSupportedRef = useRef(true);
  const frameLogRef = useRef([]);
  const frameCheckInterval = useRef(null);
  const frameModelsLoadedRef = useRef(false);
  const questions = interviewState.questions?.length ? interviewState.questions : [];
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("asking");
  const [interviewerState, setInterviewerState] = useState("Thinking");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activePrompt, setActivePrompt] = useState(questions[0]?.question || "");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [sttSupported, setSttSupported] = useState(true);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [videoPreviewReady, setVideoPreviewReady] = useState(false);
  const [frameCheckReady, setFrameCheckReady] = useState(false);
  const [frameStatus, setFrameStatus] = useState("unavailable");
  const [transcriptEntries, setTranscriptEntries] = useState(
    interviewState.transcriptEntries || [],
  );
  const [hasActiveFollowUp, setHasActiveFollowUp] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  const [pageError, setPageError] = useState("");
  const [interviewReady, setInterviewReady] = useState(false);
  const answeredQuestionCount = useMemo(
    () => transcriptEntries.filter((entry) => !entry.is_follow_up && entry.answer.trim()).length,
    [transcriptEntries],
  );
  const currentQuestion = questions[currentQuestionIndex] || null;
  const frameMessages = {
    good: { label: "✓ In frame", color: "bg-teal" },
    no_face: { label: "⚠ Face not detected", color: "bg-coral" },
    too_far: { label: "↔ Move closer", color: "bg-gold" },
    too_close: { label: "↔ Move back", color: "bg-gold" },
    off_center: { label: "↕ Center yourself", color: "bg-gold" },
    unavailable: { label: "Camera check unavailable", color: "bg-ink/70" },
  };

  useEffect(() => {
    let mounted = true;

    const prepareModels = async () => {
      try {
        await loadModels();
        if (mounted) {
          frameModelsLoadedRef.current = true;
          setFrameCheckReady(true);
          setFrameStatus("no_face");
        }
      } catch (error) {
        console.error("Face framing models failed to load:", error);
        if (mounted) {
          frameModelsLoadedRef.current = false;
          setFrameCheckReady(false);
          setFrameStatus("unavailable");
        }
      }
    };

    prepareModels();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    activePromptRef.current = activePrompt;
  }, [activePrompt]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    processingAnswerRef.current = processingAnswer;
  }, [processingAnswer]);

  useEffect(() => {
    sttSupportedRef.current = sttSupported;
  }, [sttSupported]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    if (!currentQuestion && questions.length > 0) {
      setCurrentQuestionIndex(0);
      setActivePrompt(questions[0].question);
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (!questions.length) {
      return undefined;
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSttSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const chunk = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += `${chunk} `;
        } else {
          interimTranscript += chunk;
        }
      }

      const nextTranscript = `${finalTranscript}${interimTranscript}`.trim();
      setLiveTranscript(nextTranscript);
    };

    recognition.onend = () => {
      setIsRecognitionActive(false);

      if (
        statusRef.current === "listening" &&
        !sessionEndedRef.current &&
        !processingAnswerRef.current &&
        sttSupportedRef.current
      ) {
        try {
          recognition.start();
          setIsRecognitionActive(true);
        } catch (error) {
          setSessionError(error.message || "Speech recognition could not restart.");
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setSessionError(
          "Speech recognition had trouble capturing your answer. You can keep typing below.",
        );
      }
    };

    recognitionRef.current = recognition;
    setSttSupported(true);

    return () => {
      try {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        if (typeof recognition.stop === "function") {
          recognition.stop();
        }
      } catch (error) {
        console.error("Speech recognition cleanup failed:", error);
      }
    };
  }, [questions.length]);

  const stopRecognition = () => {
    if (recognitionRef.current && isRecognitionActive) {
      recognitionRef.current.stop();
      setIsRecognitionActive(false);
    }
  };

  const startFrameCheck = () => {
    stopFrameCheck();

    frameCheckInterval.current = window.setInterval(async () => {
      if (!videoRef.current || !frameModelsLoadedRef.current || videoRef.current.readyState < 2) {
        return;
      }

      try {
        const result = await detectFace(videoRef.current);
        const entry = {
          timestamp: Date.now(),
          status: result.status,
        };
        frameLogRef.current.push(entry);
        setFrameStatus(result.status);
      } catch (error) {
        console.error("Frame check failed:", error);
      }
    }, 2000);
  };

  const stopFrameCheck = () => {
    if (frameCheckInterval.current) {
      window.clearInterval(frameCheckInterval.current);
      frameCheckInterval.current = null;
    }
  };

  const startRecognition = () => {
    if (!recognitionRef.current || !sttSupported) {
      return;
    }

    setStatus("listening");
    setInterviewerState("Listening");
    setLiveTranscript("");
    setManualAnswer("");
    setSessionError("");

    try {
      recognitionRef.current.start();
      setIsRecognitionActive(true);
    } catch (error) {
      setSessionError(error.message || "Microphone capture could not start.");
    }
  };

  const speakPrompt = (prompt) => {
    try {
      stopRecognition();
      setStatus("asking");
      setInterviewerState("Speaking");
      setActivePrompt(prompt);
      activePromptRef.current = prompt;

      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        startRecognition();
        return;
      }

      speakWhenReady(prompt, interviewState.persona, () => {
        startRecognition();
      });
    } catch (error) {
      console.error("Interview prompt speech failed:", error);
      setSessionError("Voice playback is unavailable in this browser. You can still continue.");
      startRecognition();
    }
  };

  useEffect(() => {
    if (!questions.length) {
      return undefined;
    }

    if (!interviewReady) {
      return undefined;
    }

    const setupMedia = async () => {
      sessionEndedRef.current = false;
      recordingChunksRef.current = [];
      frameLogRef.current = [];
      setCameraStatus("idle");
      setCameraError("");
      setVideoPreviewReady(false);
      setFrameStatus(frameCheckReady ? "no_face" : "unavailable");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("denied");
        setCameraError("This browser does not support camera or microphone access.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;
        setCameraStatus("granted");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.error("Video preview playback failed:", playError);
          }
        }

        if (typeof MediaRecorder !== "undefined") {
          try {
            const recorder = MediaRecorder.isTypeSupported?.("video/webm")
              ? new MediaRecorder(stream, { mimeType: "video/webm" })
              : new MediaRecorder(stream);
            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                recordingChunksRef.current.push(event.data);
              }
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
          } catch (error) {
            console.error("MediaRecorder setup failed:", error);
            setSessionError(
              "Video recording is unavailable in this browser, but the interview can still continue.",
            );
          }
        }

        startFrameCheck();
        speakPrompt(questions[0].question);
      } catch (error) {
        setCameraStatus("denied");
        setCameraError(
          error?.message || "We could not access your camera and microphone for this interview.",
        );
      }
    };

    setupMedia();

    return () => {
      sessionEndedRef.current = true;
      stopRecognition();
      stopFrameCheck();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        stopSpeaking();
      }

      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (error) {
          console.error("MediaRecorder cleanup failed:", error);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [interviewReady, questions]);

  useEffect(() => {
    const handleUnhandledError = (event) => {
      console.error("Interview page runtime error:", event.error || event.message);
      setPageError("The interview page hit a browser runtime error. Please refresh and try again.");
    };

    const handleUnhandledRejection = (event) => {
      console.error("Interview page unhandled promise rejection:", event.reason);
      setPageError("The interview page hit a browser runtime error. Please refresh and try again.");
    };

    window.addEventListener("error", handleUnhandledError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleUnhandledError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const persistInterviewState = (nextEntries, videoBlobUrl = interviewState.videoBlobUrl) => {
    setInterviewState((current) => ({
      ...current,
      transcriptEntries: nextEntries,
      videoBlobUrl,
    }));
  };

  const finalizeInterview = async (nextEntries) => {
    sessionEndedRef.current = true;
    stopRecognition();
    stopFrameCheck();

    if ("speechSynthesis" in window) {
      stopSpeaking();
    }

    let videoBlobUrl = interviewState.videoBlobUrl;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      videoBlobUrl = await new Promise((resolve) => {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
          resolve(URL.createObjectURL(blob));
        };
        mediaRecorderRef.current.stop();
      });
    }

    setInterviewState((current) => ({
      ...current,
      transcriptEntries: nextEntries,
      videoBlobUrl,
      frameLog: frameLogRef.current,
    }));
    navigate("/processing");
  };

  const advanceToNextQuestion = async (nextEntries) => {
    setHasActiveFollowUp(false);
    setLiveTranscript("");
    setManualAnswer("");

    if (currentQuestionIndex + 1 >= questions.length) {
      await finalizeInterview(nextEntries);
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setStatus("asking");
    setInterviewerState("Thinking");
    speakPrompt(questions[nextIndex].question);
  };

  const handleAnswerSubmission = async () => {
    if (!currentQuestionRef.current || processingAnswer) {
      return;
    }

    const answer = (sttSupported ? liveTranscript : manualAnswer).trim();

    if (!answer) {
      setSessionError("Please provide an answer before moving on.");
      return;
    }

    stopRecognition();
    setProcessingAnswer(true);
    setStatus("processing");
    setInterviewerState("Thinking");
    setSessionError("");

    const nextEntries = [
      ...transcriptEntries,
      {
        question_id: currentQuestionRef.current.id,
        question: activePromptRef.current,
        answer,
        is_follow_up: hasActiveFollowUp,
      },
    ];

    setTranscriptEntries(nextEntries);
    persistInterviewState(nextEntries);

    if (hasActiveFollowUp) {
      setProcessingAnswer(false);
      await advanceToNextQuestion(nextEntries);
      return;
    }

    try {
      const parsed = await decideFollowUp({
        interviewType: interviewState.interviewType,
        persona: interviewState.persona,
        currentQuestion: currentQuestionRef.current,
        transcript: answer,
      });

      if (parsed.action === "follow_up" && parsed.follow_up_question) {
        setHasActiveFollowUp(true);
        setProcessingAnswer(false);
        speakPrompt(parsed.follow_up_question);
        return;
      }
    } catch (error) {
      toast.error(error?.message || "Unable to evaluate follow-up logic right now.");
      const fallbackFollowUp = currentQuestionRef.current.follow_ups?.[0];

      if (fallbackFollowUp) {
        setHasActiveFollowUp(true);
        setProcessingAnswer(false);
        speakPrompt(fallbackFollowUp);
        return;
      }
    }

    setProcessingAnswer(false);
    await advanceToNextQuestion(nextEntries);
  };

  const handleEndInterview = async () => {
    if (isEnding) {
      return;
    }

    setIsEnding(true);

    const answeredCount = transcriptEntries.filter((entry) => !entry.is_follow_up).length;

    if (answeredCount < 3) {
      sessionEndedRef.current = true;
      stopRecognition();
      stopFrameCheck();

      if ("speechSynthesis" in window) {
        stopSpeaking();
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error("MediaRecorder early stop failed:", error);
        }
      }

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      navigate("/insufficient");
      return;
    }

    await finalizeInterview(transcriptEntries);
  };

  if (!questions.length) {
    return <Navigate to="/setup" replace />;
  }

  const showVideoFallback =
    cameraStatus === "denied" || (cameraStatus === "granted" && !videoPreviewReady);

  if (pageError) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-transparent px-6 text-ink">
        <div className="absolute inset-0 -z-20 bg-grid bg-grid opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,89,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(46,172,165,0.18),_transparent_28%),linear-gradient(135deg,_#fff7f3_0%,_#f5fbfc_100%)]" />
        <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-panel backdrop-blur">
          <p className="text-base font-semibold text-coral">{pageError}</p>
          <p className="mt-3 text-sm leading-7 text-ink/65">
            Open the browser console and share the latest error if this keeps happening.
          </p>
        </div>
      </div>
    );
  }

  if (!interviewReady) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-transparent px-6 text-ink">
        <div className="absolute inset-0 -z-20 bg-grid bg-grid opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,89,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(46,172,165,0.18),_transparent_28%),linear-gradient(135deg,_#fff7f3_0%,_#f5fbfc_100%)]" />
        <section className="w-full max-w-4xl rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-panel backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral sm:text-sm">
                Ready Check
              </p>
              <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight text-ink sm:text-[2.35rem]">
                Begin the interview when you're settled
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70 sm:text-base sm:leading-8">
                Once you start, the interviewer will begin speaking the first question right away.
                Take a breath, get your notes and camera framing where you want them, then begin when ready.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/setup")}
                  className="rounded-lg border border-ink/10 bg-white px-5 py-3 text-sm font-medium text-ink transition hover:border-teal hover:text-teal"
                >
                  Back to setup
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewReady(true)}
                  className="rounded-lg bg-coral px-5 py-3 text-sm font-medium text-white transition hover:bg-coral/90"
                >
                  Begin interview
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                  Type
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {interviewState.interviewType}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                  Persona
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {interviewState.persona}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                  Questions
                </p>
                <p className="mt-2 text-base font-semibold text-ink">{questions.length}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-transparent text-ink">
      <div className="absolute inset-0 -z-20 bg-grid bg-grid opacity-35" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,89,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(46,172,165,0.16),_transparent_28%),linear-gradient(135deg,_#fff7f3_0%,_#f5fbfc_100%)]" />
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/60 bg-white/70 px-6 py-3 backdrop-blur">
          <span className="text-sm font-medium text-ink/65">
            {interviewState.persona} Interviewer
          </span>
          <span className="text-sm text-ink/55">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-1/2 min-h-0 flex-col border-r border-white/60 bg-white/55 backdrop-blur">
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={() => setVideoPreviewReady(true)}
                onCanPlay={() => setVideoPreviewReady(true)}
                onPlaying={() => setVideoPreviewReady(true)}
                onError={() => {
                  setVideoPreviewReady(false);
                  setCameraError("Your camera is connected, but the live preview could not be displayed.");
                }}
                className={[
                  "h-full w-full object-cover scale-x-[-1]",
                  showVideoFallback ? "invisible" : "visible",
                ].join(" ")}
              />
              {showVideoFallback ? (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                  <div className="max-w-md rounded-[1.5rem] border border-white/10 bg-white/10 px-6 py-5 backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                      Camera preview
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/80">
                      {cameraStatus === "denied"
                        ? cameraError
                        : !frameCheckReady
                          ? "Live preview is available, but the framing check models are missing. Add the two tiny face detector files to public/models to enable this feature."
                        : cameraError ||
                          "Your camera and mic are active, but the live preview is still loading. You can continue the interview, and the recording should still capture normally."}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="absolute bottom-3 left-3">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs text-white",
                    frameMessages[frameStatus]?.color || "bg-teal",
                  ].join(" ")}
                >
                  {frameMessages[frameStatus]?.label || "✓ In frame"}
                </span>
              </div>
            </div>

            <div className="h-2/5 overflow-y-auto border-t border-white/60 bg-mist/80 p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-teal">
                Your Response
              </p>
              <p className="text-sm leading-relaxed text-ink/85">
                {(sttSupported ? liveTranscript : manualAnswer) || (
                  <span className="italic text-ink/40">
                    Your answer will appear here as you speak…
                  </span>
                )}
              </p>

              {!sttSupported ? (
                <div className="mt-4">
                  <textarea
                    rows={5}
                    value={manualAnswer}
                    onChange={(event) => setManualAnswer(event.target.value)}
                    placeholder="Type your answer here…"
                    className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm leading-7 text-ink outline-none transition focus:border-teal"
                  />
                </div>
              ) : null}

              {sessionError ? (
                <p className="mt-4 rounded-[1rem] border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral">
                  {sessionError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex w-1/2 min-h-0 flex-col justify-between bg-white/72 p-8 backdrop-blur">
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-2">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-ink/45">
                  Current Question
                </p>
                <p className="text-xl font-medium leading-relaxed text-ink">
                  {activePrompt || currentQuestion?.question}
                </p>
                {currentQuestion?.resume_reference ? (
                  <p className="mt-3 text-xs italic text-ink/45">
                    📄 Based on: "{currentQuestion.resume_reference}"
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full animate-pulse",
                    status === "asking"
                      ? "bg-sky-400"
                      : status === "listening"
                        ? "bg-teal"
                        : "bg-gold",
                  ].join(" ")}
                />
                <span className="text-sm text-ink/60">
                  {status === "asking"
                    ? "Asking…"
                    : status === "listening"
                      ? "Listening…"
                      : "Processing…"}
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-mist p-4">
                <p className="mb-2 text-xs uppercase tracking-widest text-coral">
                  Interviewer posture
                </p>
                <p className="text-sm leading-7 text-ink/75">
                  {interviewerState === "Speaking"
                    ? "Delivering the next prompt with a calm interview cadence."
                    : interviewerState === "Listening"
                      ? "Focused on your response and waiting for specific detail."
                      : "Reviewing your answer before deciding whether to move on or probe deeper."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnswerSubmission}
              disabled={
                status !== "listening" ||
                processingAnswer ||
                !(sttSupported ? liveTranscript.trim() : manualAnswer.trim())
              }
              className="mt-6 w-full rounded-[1rem] bg-coral py-3 text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {processingAnswer ? "Processing…" : "Done Answering"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center border-t border-white/60 bg-white/70 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={handleEndInterview}
            disabled={isEnding}
            className="rounded-[1rem] border border-coral/40 px-6 py-2 text-sm text-coral transition-colors hover:border-coral hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnding ? "Ending…" : "End Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
