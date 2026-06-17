import { glob } from 'glob'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, relative, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const HTML_DIR = resolve(ROOT, 'html')
const OUT_DIR = resolve(ROOT, 'public/api')
const WELL_KNOWN_DIR = resolve(ROOT, 'public/.well-known')
const BASE = '/presentation'

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(WELL_KNOWN_DIR, { recursive: true })

// ── Types ──────────────────────────────────────────────────────────────────

interface PresentationMeta {
  title:       string
  subject:     string
  year:        number
  description: string
  accent:      string
  bg:          string
  tags:        string[]
}

interface PresentationEntry extends PresentationMeta {
  id:       string
  href:     string
  filePath: string
  addedAt:  string
}

// ── Helper functions ───────────────────────────────────────────────────────

function extractMetadata(content: string): PresentationMeta | null {
  // Try multi-line format first (new format)
  let match = content.match(/^<!doctype html>\s*<!--@presentation\n([\s\S]*?)\n-->/i)
  
  // Fall back to single-line format (old format)
  if (!match) {
    match = content.match(/^<!doctype html>\s*<!--@presentation\s+(\{[\s\S]*?\})\s*-->/i)
  }
  
  if (!match) return null
  
  try {
    const parsed = JSON.parse(match[1])
    // Map old schema to new schema
    return {
      title:       parsed.title,
      subject:     parsed.subject,
      year:        parsed.year,
      description: parsed.description,
      accent:      parsed.accent,
      bg:          parsed.bg,
      tags:        parsed.tags ?? [],
    }
  } catch {
    return null
  }
}

function deriveId(filePath: string): string {
  return filePath
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase()
}

function getDefaultColors(subject: string): { accent: string; bg: string } {
  const defaults: Record<string, { accent: string; bg: string }> = {
    'PDHPE': { accent: '#e8ff47', bg: '#0a0e1a' },
    'Science': { accent: '#1a1a18', bg: '#f5f4f0' },
    'History': { accent: '#d4a574', bg: '#1a1612' },
    'English': { accent: '#7aa2f7', bg: '#0d1117' },
    'Commerce': { accent: '#f0c674', bg: '#161b22' },
    'Mathematics': { accent: '#c084fc', bg: '#110e1a' },
    'Physics': { accent: '#1a1a18', bg: '#f5f4f0' },
  }
  return defaults[subject] || { accent: '#888888', bg: '#1a1a1a' }
}

// ── Main discovery ─────────────────────────────────────────────────────────

const files = glob.sync('**/*.html', { cwd: HTML_DIR, absolute: true })
const entries: PresentationEntry[] = []

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  const meta = extractMetadata(content)
  
  if (!meta) {
    console.warn(`[discover] No valid @presentation metadata in ${file}, skipping.`)
    continue
  }

  const relPath = relative(ROOT, file).replace(/\\/g, '/')
  const urlPath = relative(HTML_DIR, file).replace(/\\/g, '/')
  const id = deriveId(urlPath)
  const href = `${BASE}/html/${urlPath}`
  const colors = getDefaultColors(meta.subject)

  entries.push({
    title:       meta.title,
    subject:     meta.subject,
    year:        meta.year,
    description: meta.description,
    accent:      meta.accent || colors.accent,
    bg:          meta.bg || colors.bg,
    tags:        meta.tags ?? [],
    id,
    href,
    filePath:    relPath,
    addedAt:     new Date().toISOString(),
  })
}

entries.sort((a, b) => a.title.localeCompare(b.title))

// ── Write manifest.json ────────────────────────────────────────────────────

const manifest = {
  $schema:    `${BASE}/api/spec.json`,
  generated:  new Date().toISOString(),
  count:      entries.length,
  presentations: entries,
}
writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log(`[discover] manifest.json — ${entries.length} presentations`)

// ── Write per-presentation JSON ────────────────────────────────────────────

for (const entry of entries) {
  const dir = `${OUT_DIR}/presentation`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/${entry.id}.json`, JSON.stringify(entry, null, 2))
}

// ── Write OpenAPI spec ─────────────────────────────────────────────────────

const spec = {
  openapi: '3.1.0',
  info: {
    title:   'Presentations API',
    version: '1.0.0',
    description: `
Read-only static API for the dxrkinfuser44/presentation GitHub Pages site.
All endpoints return pre-generated JSON files. There are no POST endpoints on this domain.
To CREATE a new presentation, use the GitHub Contents API (see x-agent-guide).
    `.trim(),
    contact: { url: 'https://github.com/dxrkinfuser44/presentation' },
  },
  'x-agent-guide': `${BASE}/api/agent-guide.json`,
  'x-llms-txt':    `${BASE}/llms.txt`,
  servers: [{ url: `https://dxrkinfuser44.github.io${BASE}` }],
  paths: {
    '/api/manifest.json': {
      get: {
        operationId: 'listPresentations',
        summary:     'List all presentations',
        description: 'Returns metadata for every presentation discovered in the html/ directory.',
        responses: {
          '200': {
            description: 'Array of presentation objects',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Manifest' } } },
          },
        },
      },
    },
    '/api/presentation/{id}.json': {
      get: {
        operationId: 'getPresentation',
        summary:     'Get a single presentation by ID',
        parameters: [{
          name: 'id', in: 'path', required: true,
          schema: { type: 'string' },
          description: 'Slug derived from the file path. See manifest for valid IDs.',
        }],
        responses: {
          '200': {
            description: 'Single presentation object',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Presentation' } } },
          },
        },
      },
    },
    '/api/agent-guide.json': {
      get: {
        operationId: 'getAgentGuide',
        summary:     'Full agent instructions for creating and managing presentations',
        responses: { '200': { description: 'Agent guide JSON' } },
      },
    },
    '/llms.txt': {
      get: {
        operationId: 'getLlmsTxt',
        summary:     'LLM-readable plain text instructions',
        responses: { '200': { description: 'Plain text' } },
      },
    },
  },
  components: {
    schemas: {
      Presentation: {
        type: 'object',
        required: ['id', 'title', 'subject', 'year', 'description', 'accent', 'bg', 'href', 'filePath'],
        properties: {
          id:          { type: 'string', description: 'URL-safe slug derived from file path' },
          title:       { type: 'string' },
          subject:     { type: 'string', description: 'e.g. PDHPE, Science, History, English, Commerce, Mathematics' },
          year:        { type: 'integer', description: 'School year group, e.g. 10' },
          description: { type: 'string' },
          accent:      { type: 'string', description: 'CSS hex colour for card accent strip' },
          bg:          { type: 'string', description: 'CSS hex colour for card background' },
          tags:        { type: 'array', items: { type: 'string' } },
          href:        { type: 'string', description: 'Absolute URL path to the presentation' },
          filePath:    { type: 'string', description: 'Repo-relative file path, used for GitHub API submissions' },
          addedAt:     { type: 'string', format: 'date-time' },
        },
      },
      Manifest: {
        type: 'object',
        properties: {
          generated:     { type: 'string', format: 'date-time' },
          count:         { type: 'integer' },
          presentations: { type: 'array', items: { $ref: '#/components/schemas/Presentation' } },
        },
      },
    },
  },
}
writeFileSync(`${OUT_DIR}/spec.json`, JSON.stringify(spec, null, 2))
console.log('[discover] spec.json')

// ── Write agent-guide.json ─────────────────────────────────────────────────

const agentGuide = {
  version: '1.0.0',
  description: 'Instructions for AI agents that want to read, create, or update presentations on this site.',

  reading: {
    summary: 'Fetch manifest.json to get all presentations. Fetch /api/presentation/{id}.json for a single entry.',
    manifestUrl: `https://dxrkinfuser44.github.io${BASE}/api/manifest.json`,
    specUrl:     `https://dxrkinfuser44.github.io${BASE}/api/spec.json`,
  },

  creating: {
    summary: 'This site is static (GitHub Pages). To add a presentation, commit an HTML file to the repo using the GitHub Contents API.',
    steps: [
      '1. Produce a self-contained HTML file. All CSS and JS must be inline — no external assets.',
      '2. Add the @presentation metadata comment block as the SECOND line of the file (immediately after <!doctype html>).',
      '3. Place the file at html/{year}/{subject}/{slug}.html. Use lowercase, hyphens for spaces.',
      '4. Commit it using the GitHub Contents API (PUT /repos/dxrkinfuser44/presentation/contents/{path}).',
      '5. A GitHub Actions workflow runs automatically on push to main, discovers the file, rebuilds the dashboard, and deploys.',
      '6. The presentation is live within ~60 seconds of the commit.',
    ],
    metadataFormat: {
      description: 'This comment block must appear as the second line of the HTML file.',
      template: '<!--@presentation\n{\n  "title":       "Required. Display title.",\n  "subject":     "Required. e.g. PDHPE, Science, History, English, Commerce, Mathematics",\n  "year":        10,\n  "description": "Required. 1-2 sentences shown on the dashboard card.",\n  "accent":      "#hexcolour - Required. Primary colour for the card accent strip.",\n  "bg":          "#hexcolour - Required. Card background colour.",\n  "tags":        ["optional", "array", "of", "strings"]\n}\n-->',
    },
    githubApi: {
      endpoint:    'PUT https://api.github.com/repos/dxrkinfuser44/presentation/contents/{path}',
      authHeader:  'Authorization: Bearer {GITHUB_TOKEN}',
      body: {
        message: 'Add presentation: {title}',
        content: 'base64-encoded content of the HTML file',
        branch:  'main',
      },
      docs: 'https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents',
    },
  },

  htmlConventions: {
    summary: 'Conventions for producing well-formed presentation HTML files.',
    structure: 'Use a .deck container with .slide children. Each slide is full-viewport (100vw x 100vh). Navigation via keyboard (arrow keys) or click.',
    selfContained: 'All CSS in a <style> tag in <head>. All JS in a <script> tag before </body>. No external files except Google Fonts CDN (acceptable).',
    slidePattern: `
<!-- Minimal skeleton: -->
<!doctype html>
<!--@presentation { ... } -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Title</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { overflow: hidden; }
      .deck { position: relative; width: 100vw; height: 100vh; }
      .slide { position: absolute; inset: 0; display: flex; flex-direction: column;
               justify-content: center; align-items: center;
               opacity: 0; pointer-events: none; transition: opacity 0.4s; }
      .slide.active { opacity: 1; pointer-events: auto; }
    </style>
  </head>
  <body>
    <div class="deck">
      <div class="slide active">Slide 1</div>
      <div class="slide">Slide 2</div>
    </div>
    <script>
      const slides = document.querySelectorAll('.slide')
      let current = 0
      function go(n) {
        slides[current].classList.remove('active')
        current = Math.max(0, Math.min(n, slides.length - 1))
        slides[current].classList.add('active')
      }
      document.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(current + 1)
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(current - 1)
      })
    </script>
  </body>
</html>
    `.trim(),
    agentHiddenComments: 'You MAY include HTML comments throughout the file as agent-readable documentation. These are invisible to the human audience in the browser. Use them to document slide purpose, data sources, or instructions for future agents editing the file.',
  },

  subjectList: ['PDHPE', 'Science', 'History', 'English', 'Commerce', 'Mathematics', 'Physics'],
  yearGroups: [7, 8, 9, 10, 11, 12],
  filePathPattern: 'html/year{year}/{subject-lowercase-hyphens}/{presentation-slug}.html',
}

writeFileSync(`${OUT_DIR}/agent-guide.json`, JSON.stringify(agentGuide, null, 2))
console.log('[discover] agent-guide.json')

// ── Write llms.txt ─────────────────────────────────────────────────────────

const llmsTxt = `# dxrkinfuser44/presentation

> A self-hosted interactive presentation system built as a static GitHub Pages site.

## What this is

A dashboard that lists school presentations (Year 10 currently) and serves them directly as fullscreen interactive HTML files. The site is fully static — no server, no database. GitHub Actions rebuilds the dashboard automatically on every push.

## API

All endpoints are static JSON files. There are no POST endpoints on this domain.

- Manifest (all presentations): https://dxrkinfuser44.github.io/presentation/api/manifest.json
- OpenAPI spec: https://dxrkinfuser44.github.io/presentation/api/spec.json
- Agent guide (this file in JSON form): https://dxrkinfuser44.github.io/presentation/api/agent-guide.json

## How to add a presentation (agent instructions)

1. Produce a self-contained HTML file. All CSS and JS must be inline.
2. Add the @presentation metadata comment immediately after <!doctype html> (second line of file).
3. File path convention: html/year{N}/{subject}/{slug}.html
4. Commit via GitHub Contents API: PUT https://api.github.com/repos/dxrkinfuser44/presentation/contents/{path}
5. GitHub Actions auto-deploys in ~60 seconds. No other config needed.

## Metadata block format (required in every presentation HTML)

<!--@presentation
{
  "title":       "Display title",
  "subject":     "PDHPE | Science | History | English | Commerce | Mathematics | Physics",
  "year":        10,
  "description": "1-2 sentence description for the dashboard card.",
  "accent":      "#hexcolour",
  "bg":          "#hexcolour",
  "tags":        ["optional", "tags"]
}
-->

## HTML conventions

- .deck container with .slide children, each 100vw x 100vh
- Keyboard navigation: ArrowRight/Down advances, ArrowLeft/Up goes back
- Google Fonts CDN is acceptable. No other external assets.
- Agent-readable HTML comments are encouraged for documentation inside slide files.

## Links

- Repo: https://github.com/dxrkinfuser44/presentation
- Dashboard: https://dxrkinfuser44.github.io/presentation/
- GitHub Contents API docs: https://docs.github.com/en/rest/repos/contents
`

writeFileSync(resolve(ROOT, 'public/llms.txt'), llmsTxt)
console.log('[discover] llms.txt')

// ── Write .well-known/ai-plugin.json ──────────────────────────────────────

const aiPlugin = {
  schema_version: 'v1',
  name_for_human: 'Presentations',
  name_for_model: 'presentations_site',
  description_for_human: 'Browse and manage school presentations.',
  description_for_model: 'Access the presentations site API. Use listPresentations to see all available presentations. Read agent-guide.json for full instructions on creating new presentations via the GitHub API. The site is static — all write operations go through the GitHub Contents API.',
  api: {
    type: 'openapi',
    url:  `https://dxrkinfuser44.github.io${BASE}/api/spec.json`,
  },
  logo_url:         `https://dxrkinfuser44.github.io${BASE}/favicon.ico`,
  contact_email:    'see github repo',
  legal_info_url:   `https://github.com/dxrkinfuser44/presentation`,
}

writeFileSync(`${WELL_KNOWN_DIR}/ai-plugin.json`, JSON.stringify(aiPlugin, null, 2))
console.log('[discover] .well-known/ai-plugin.json')

console.log('[discover] done.')