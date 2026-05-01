function ChartLoadingCard({ message = "Loading chart…", compact = false }) {
  return (
    <div className="mt-4 rounded-[1.5rem] bg-mist p-4">
      <div
        className={[
          "flex animate-pulse items-center justify-center rounded-[1.25rem] border border-ink/10 bg-white",
          compact ? "h-[220px] xl:h-[240px]" : "h-[300px]",
        ].join(" ")}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/45">
          {message}
        </p>
      </div>
    </div>
  );
}

export default ChartLoadingCard;
