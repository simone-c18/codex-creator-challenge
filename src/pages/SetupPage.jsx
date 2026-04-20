import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";

function SetupPage() {
  const navigate = useNavigate();
  const [setupState, setSetupState] = useState({
    role: "Senior Product Manager",
    focus: "Behavioral and strategic thinking",
    duration: "30 minutes",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSetupState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/interview");
  };

  return (
    <PageShell
      eyebrow="Setup"
      title="Define the session you want to rehearse"
      description="Pick a target role, decide what kind of signals you want feedback on, and keep the prep lightweight so you can move quickly into practice."
    >
      <form className="grid gap-5 lg:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink/80">Role</span>
            <input
              name="role"
              value={setupState.role}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink/80">Focus area</span>
            <input
              name="focus"
              value={setupState.focus}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink/80">Duration</span>
            <select
              name="duration"
              value={setupState.duration}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3"
            >
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
            </select>
          </label>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral/90 lg:w-auto"
          >
            Begin Interview
          </button>
        </div>
      </form>
    </PageShell>
  );
}

export default SetupPage;
