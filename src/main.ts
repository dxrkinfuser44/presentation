import "./style.css";

interface Presentation {
  id: string;
  title: string;
  subject: string;
  year: number;
  description: string;
  accent: string;
  bg: string;
  tags: string[];
  href: string;
}

async function main() {
  const app = document.getElementById("app")!;

  // Header
  app.innerHTML = `
    <header>
      <h1>Presentations</h1>
      <p class="subtitle">Year 10 · NSW Curriculum</p>
    </header>
    <main id="grid" class="loading">
      <div class="spinner"></div>
    </main>
  `;

  // Fetch manifest (generated at build time by discover.ts)
  let presentations: Presentation[] = [];
  try {
    const res = await fetch("/presentation/api/manifest.json");
    const data = await res.json();
    presentations = data.presentations ?? [];
  } catch {
    document.getElementById("grid")!.innerHTML =
      '<p class="error">Could not load presentations.</p>';
    return;
  }

  const grid = document.getElementById("grid")!;
  grid.className = "grid";

  if (presentations.length === 0) {
    grid.innerHTML = '<p class="empty">No presentations found.</p>';
    return;
  }

  grid.innerHTML = presentations
    .map(
      (p) => `
    <a class="card" href="${p.href}" style="--bg:${p.bg};--accent:${p.accent}">
      <div class="card-accent-bar"></div>
      <div class="card-body">
        <span class="subject-badge">${p.subject} · Year ${p.year}</span>
        <h2 class="card-title">${p.title}</h2>
        <p class="card-desc">${p.description}</p>
        <div class="card-tags">
          ${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </div>
      <div class="card-arrow">→</div>
    </a>
  `,
    )
    .join("");
}

void main();
