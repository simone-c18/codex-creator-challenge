import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { decideFollowUp } from "../lib/groqFollowUp";

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

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(prompt);
      utterance.onend = () => {
        startRecognition();
      };
      utterance.onerror = () => {
        startRecognition();
      };
      window.speechSynthesis.speak(utterance);
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
      setCameraStatus("idle");
      setCameraError("");

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

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
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

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
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

    persistInterviewState(nextEntries, videoBlobUrl);
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

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
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

  if (pageError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-950 px-6 text-white">
        <div className="w-full max-w-2xl rounded-3xl border border-red-900/50 bg-gray-900 p-8 text-center shadow-2xl">
          <p className="text-base font-semibold text-red-400">{pageError}</p>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Open the browser console and share the latest error if this keeps happening.
          </p>
        </div>
      </div>
    );
  }

  if (!interviewReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-gray-950 px-6">
        <section className="w-full max-w-4xl rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400 sm:text-sm">
                Ready Check
              </p>
              <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-white sm:text-[2.35rem]">
                Begin the interview when you're settled
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base sm:leading-8">
                Once you start, the interviewer will begin speaking the first question right away.
                Take a breath, get your notes and camera framing where you want them, then begin when ready.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/setup")}
                  className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
                >
                  Back to setup
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewReady(true)}
                  className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Begin interview
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-gray-800 bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Type
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {interviewState.interviewType}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Persona
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {interviewState.persona}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Questions
                </p>
                <p className="mt-2 text-base font-semibold text-white">{questions.length}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-950 text-white">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <span className="text-sm font-medium text-gray-400">
            {interviewState.persona} Interviewer
          </span>
          <span className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-1/2 min-h-0 flex-col border-r border-gray-800">
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-black">
              {cameraStatus === "granted" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm leading-7 text-gray-500">
                  {cameraStatus === "denied"
                    ? cameraError
                    : "Starting your camera and microphone..."}
                </div>
              )}
            </div>

            <div className="h-2/5 overflow-y-auto border-t border-gray-800 bg-gray-900 p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">
                Your Response
              </p>
              <p className="text-sm leading-relaxed text-gray-200">
                {(sttSupported ? liveTranscript : manualAnswer) || (
                  <span className="italic text-gray-600">
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
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-gray-500"
                  />
                </div>
              ) : null}

              {sessionError ? (
                <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                  {sessionError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex w-1/2 min-h-0 flex-col justify-between bg-gray-900 p-8">
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-2">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">
                  Current Question
                </p>
                <p className="text-xl font-medium leading-relaxed text-white">
                  {activePrompt || currentQuestion?.question}
                </p>
                {currentQuestion?.resume_reference ? (
                  <p className="mt-3 text-xs italic text-gray-500">
                    📄 Based on: "{currentQuestion.resume_reference}"
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full animate-pulse",
                    status === "asking"
                      ? "bg-blue-400"
                      : status === "listening"
                        ? "bg-green-400"
                        : "bg-amber-400",
                  ].join(" ")}
                />
                <span className="text-sm text-gray-400">
                  {status === "asking"
                    ? "Asking…"
                    : status === "listening"
                      ? "Listening…"
                      : "Processing…"}
                </span>
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
              className="mt-6 w-full rounded-lg bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {processingAnswer ? "Processing…" : "Done Answering"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center border-t border-gray-800 bg-gray-950 px-6 py-4">
          <button
            type="button"
            onClick={handleEndInterview}
            disabled={isEnding}
            className="rounded-lg border border-red-800 px-6 py-2 text-sm text-red-400 transition-colors hover:border-red-600 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnding ? "Ending…" : "End Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
