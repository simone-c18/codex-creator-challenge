import { useNavigate } from "react-router-dom";

function InsufficientPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-950 px-6 text-center">
      <div className="mb-6 text-5xl">📋</div>
      <h1 className="mb-3 text-2xl font-semibold text-white">Not Enough Data</h1>
      <p className="mb-8 max-w-md text-base leading-relaxed text-gray-400">
        You answered fewer than 3 questions, so we don&apos;t have enough information
        to generate a meaningful report. Try again and complete at least 3 questions
        for your results.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => navigate("/setup")}
          className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-lg border border-gray-700 px-6 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-900"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default InsufficientPage;
