import Plotly from "plotly.js-dist-min";

const DARK: Partial<Plotly.Layout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#e2e8f0", family: "DM Sans, sans-serif" },
  margin: { t: 32, r: 16, b: 40, l: 48 },
};

/** Render a new Plotly chart into `el`. */
export function renderLive(
  el: HTMLElement,
  traces: Plotly.Data[],
  layout: Partial<Plotly.Layout> = {},
): void {
  void Plotly.newPlot(el, traces, { ...DARK, ...layout }, { responsive: true });
}

/**
 * Append data points to an existing trace.
 * Call repeatedly on a setInterval for real-time graphs.
 * `maxPoints` caps the total points shown (default 300).
 */
export function appendData(
  el: HTMLElement,
  x: (number | string)[],
  y: number[],
  traceIndex = 0,
  maxPoints = 300,
): void {
  void Plotly.extendTraces(el, { x: [x], y: [y] }, [traceIndex], maxPoints);
}

/** Remove chart and free memory. */
export function destroyLive(el: HTMLElement): void {
  Plotly.purge(el);
}
