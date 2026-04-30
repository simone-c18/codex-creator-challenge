import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageTransition from "./PageTransition";

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
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <header className="animate-rise rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-panel backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal sm:text-sm">
                Interviewly
              </p>
              <h1 className="font-display text-[2rem] font-semibold leading-tight sm:text-[2.35rem]">
                Practice smarter, reflect faster
              </h1>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <p className="text-sm text-ink/70 break-all sm:break-normal">
                Signed in as{" "}
                <span className="font-semibold text-ink">
                  {currentUser?.displayName || currentUser?.email || "Candidate"}
                </span>
              </p>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-ink/10 bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-full px-3.5 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm",
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

        <main className="flex-1 py-4 sm:py-5">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
