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
    <div className="mt-5 min-w-0 overflow-hidden rounded-[1.5rem] bg-mist p-3 sm:p-4">
      <div className="h-[190px] w-full min-w-0 overflow-hidden sm:h-[220px] xl:h-[185px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartBase}>
            <PolarGrid stroke="#c8d6df" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#132238", fontSize: 10 }} />
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
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2 overflow-hidden">
        {comparisonData.map((session, index) => (
          <div
            key={session.label}
            className="flex max-w-full min-w-0 items-center gap-2 rounded-full bg-white px-3 py-1.5"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index] }}
            />
            <span className="truncate text-xs font-semibold text-ink/70">{session.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardTrendChart;
