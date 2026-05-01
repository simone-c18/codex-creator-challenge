import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

function ResultsRadarChart({ scoreData, compact = false }) {
  return (
    <div
      className={[
        "mt-4 w-full rounded-[1.5rem] bg-mist p-4",
        compact ? "h-[220px] xl:h-[240px]" : "h-[340px]",
      ].join(" ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={scoreData}>
          <PolarGrid stroke="#c8d6df" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#132238", fontSize: 12 }} />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#ff7a59"
            fill="#ff7a59"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ResultsRadarChart;
