import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = location.state?.from?.pathname || "/dashboard";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "login") {
        await loginWithEmail(formState.email, formState.password);
      } else {
        await registerWithEmail(formState.email, formState.password);
      }
      navigate(nextPath, { replace: true });
    } catch (firebaseError) {
      setError(firebaseError.message || "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setBusy(true);

    try {
      await loginWithGoogle();
      navigate(nextPath, { replace: true });
    } catch (firebaseError) {
      setError(firebaseError.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="animate-rise rounded-[2rem] border border-white/70 bg-ink p-8 text-white shadow-panel md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">
            AI Interview Coach
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Turn practice interviews into focused, high-signal coaching.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
            This starter app includes authentication, protected routing, and a clean
            end-to-end flow from interview setup to results review.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              "Customize the target role",
              "Run a guided interview session",
              "Review feedback and next steps",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                  Step {index + 1}
                </p>
                <p className="mt-3 text-base font-medium text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-rise rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur md:p-10">
          <div className="flex rounded-full bg-mist p-1">
            {["login", "register"].map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={[
                  "flex-1 rounded-full px-4 py-3 text-sm font-semibold capitalize transition",
                  mode === entry ? "bg-white text-ink shadow" : "text-ink/60",
                ].join(" ")}
              >
                {entry}
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleEmailAuth}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink/80">Email</span>
              <input
                required
                type="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="candidate@example.com"
                className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none ring-0 transition focus:border-teal"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink/80">Password</span>
              <input
                required
                type="password"
                name="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none ring-0 transition focus:border-teal"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Working..."
                : mode === "login"
                  ? "Continue with Email"
                  : "Create Account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="text-sm font-medium text-ink/50">or</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={busy}
            className="w-full rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>

          {/* <p className="mt-6 text-sm leading-7 text-ink/60">
            Add your Firebase config values to the local <code>.env</code> file
            before using production credentials.
          </p> */}
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
