function ChartLoadingCard({ message = "Loading chart…" }) {
  return (
    <div className="mt-6 rounded-[1.5rem] bg-mist p-6">
      <div className="flex h-[300px] animate-pulse items-center justify-center rounded-[1.25rem] border border-ink/10 bg-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/45">
          {message}
        </p>
      </div>
    </div>
  );
}

export default ChartLoadingCard;
