import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/setup", label: "Setup" },
  { to: "/interview", label: "Interview" },
  { to: "/processing", label: "Processing" },
  { to: "/results", label: "Results" },
];

function AppLayout() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-ink">
      <div className="absolute inset-0 -z-10 bg-grid bg-grid opacity-40" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="animate-rise rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-panel backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal">
                AI Interview Coach
              </p>
              <h1 className="font-display text-3xl font-semibold">
                Practice smarter, reflect faster
              </h1>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="text-sm text-ink/70">
                Signed in as{" "}
                <span className="font-semibold text-ink">
                  {currentUser?.displayName || currentUser?.email || "Candidate"}
                </span>
              </p>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-ink/10 bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-coral text-white shadow-lg shadow-coral/30"
                      : "bg-mist text-ink/80 hover:bg-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
