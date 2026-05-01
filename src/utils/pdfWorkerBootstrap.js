if (typeof Math.sumPrecise !== "function") {
  Math.sumPrecise = (values) =>
    values.reduce((total, value) => total + Number(value || 0), 0);
}

await import("pdfjs-dist/build/pdf.worker.mjs");
