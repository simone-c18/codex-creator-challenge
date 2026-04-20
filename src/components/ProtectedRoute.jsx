import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { currentUser, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 px-8 py-6 text-center shadow-panel backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal">
            Loading
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
            Checking your session...
          </h1>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
