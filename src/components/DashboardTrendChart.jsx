import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function DashboardTrendChart({ chartBase, comparisonData }) {
  const colors = ["#ff7a59", "#1f9d8b", "#132238"];

  return (
    <div className="mt-6 h-[360px] rounded-[1.5rem] bg-mist p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartBase}>
          <PolarGrid stroke="#c8d6df" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#132238", fontSize: 12 }} />
          <Tooltip />
          {comparisonData.map((session, index) => (
            <Radar
              key={session.label}
              name={session.label}
              dataKey={`session${index}`}
              stroke={colors[index]}
              fill={colors[index]}
              fillOpacity={0.12}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap gap-3">
        {comparisonData.map((session, index) => (
          <div key={session.label} className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: colors[index] }}
            />
            <span className="text-sm font-semibold text-ink/70">{session.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardTrendChart;
