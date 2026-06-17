declare const loadPyodide: (opts?: object) => Promise<any>

let _py: any = null

/**
 * Initialises Pyodide with matplotlib and numpy.
 * Safe to call multiple times — returns cached instance.
 * Requires the Pyodide CDN script tag in the host page:
 *   <script src="https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js"></script>
 */
async function getPyodide() {
  if (_py) return _py
  _py = await loadPyodide()
  await _py.loadPackage(['matplotlib', 'numpy'])
  return _py
}

/**
 * Execute Python code that produces a matplotlib figure.
 * Renders the result as a base64 PNG into `targetImg.src`.
 *
 * The provided `pythonCode` runs after:
 *   import matplotlib; matplotlib.use('agg')
 *   import matplotlib.pyplot as plt
 *   import numpy as np, io, base64
 *   plt.clf()
 *
 * So you can call plt.* directly. The function saves and encodes the figure automatically.
 *
 * Example:
 *   await renderMatplotlib(`
 *     x = np.linspace(0, 10, 200)
 *     plt.plot(x, np.sin(x))
 *     plt.title('sin(x)')
 *   `, imgEl)
 */
export async function renderMatplotlib(code: string, img: HTMLImageElement): Promise<void> {
  const py = await getPyodide()
  const script = `
import matplotlib; matplotlib.use('agg')
import matplotlib.pyplot as plt
import numpy as np, io, base64
plt.clf()
${code}
_buf = io.BytesIO()
plt.savefig(_buf, format='png', bbox_inches='tight', dpi=150)
_buf.seek(0)
base64.b64encode(_buf.read()).decode()
`
  const b64: string = await py.runPythonAsync(script)
  img.src = `data:image/png;base64,${b64}`
}