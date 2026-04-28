import { createContext, useContext, useMemo, useState } from "react";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const [interviewState, setInterviewState] = useState({
    questions: [],
    interviewType: "Behavioral",
    persona: "Friendly Startup",
    transcriptEntries: [],
    videoBlobUrl: null,
    report: null,
  });

  const value = useMemo(
    () => ({
      interviewState,
      setInterviewState,
    }),
    [interviewState],
  );

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  return context;
}
