# Presentation Repository

Static HTML presentations deployed to GitHub Pages.

## Structure

```
html/
  year10/
    science/
      newtons laws.html     # Newton's Laws of Motion (Physics)
    pdhpe/
      vaping-presentation.html  # Health Impacts of Vaping (PDHPE)
```

## Deployment

- **GitHub Pages** via `.github/workflows/static.yml`
- Triggers: push to `main` branch, or manual workflow_dispatch
- Uploads entire repo root (`.`) as artifact
- No build step — raw HTML served directly

## Editing Presentations

Each presentation is a self-contained HTML file with embedded CSS/JS:
- Slide navigation via arrow keys, click, or touch swipe
- Progress bar and dot indicators
- No external dependencies beyond Google Fonts

To add a new presentation:
1. Create HTML file under `html/<subject>/<topic>.html`
2. Follow existing slide structure (`.deck` → `.slide` elements)
3. Push to `main` — auto-deploys

## Local Preview

Open HTML files directly in browser. No server required.

## Notes

- No package.json, no build tools, no tests
- No README or docs beyond this file
- Branch: `main` (default)