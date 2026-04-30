import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppLayout from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProcessingPage = lazy(() => import("./pages/ProcessingPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const SetupPage = lazy(() => import("./pages/SetupPage"));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-panel backdrop-blur md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal">
          Loading
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
          Preparing your workspace
        </h1>
        <p className="mt-4 text-base leading-8 text-ink/70">
          Pulling in the next screen and getting everything ready.
        </p>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/processing" element={<ProcessingPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AnimatedRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "999px",
            padding: "14px 18px",
            background: "#132238",
            color: "#ffffff",
            fontWeight: 600,
          },
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
