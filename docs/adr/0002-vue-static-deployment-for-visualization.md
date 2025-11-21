# 2. Vue.js with Static File Deployment for Code Visualization

Date: 2025-11-21

## Status

Accepted

## Context

Opportunity 002 (Code Visibility) requires interactive visualization of code volume across repositories. Teams need to see where code lives, understand relative sizes, and drill down from repository to file level.

Three distinct solutions were evaluated:

**Solution 1: Terminal-Native Visualization**
- Pure CLI with Unicode box drawing and ANSI colors
- Zero dependencies beyond Python stdlib
- Works over SSH, instant startup
- Limited visual richness and interactivity

**Solution 2: Static HTML Generator**
- Python-generated self-contained HTML files
- Embedded SVG treemap with minimal vanilla JavaScript
- No build step, shareable artifacts
- Medium interactivity, limited by vanilla JS complexity

**Solution 3: Vue.js Single-Page Application**
- Modern frontend framework with component architecture
- Rich interactivity (zoom, pan, filter, search)
- Requires build tooling (npm/Vite)
- Can be deployed as static files (no backend server needed)

The Product Brief explicitly calls for "Interactive SVG treemap (WinDirStat style)" and "Vue.js web application" as the frontend technology.

Opportunity 001 established a principle of zero external dependencies for the CLI tool (`aina`), but the visualization frontend is a separate component with different constraints. Users expect rich interactivity for visual exploration tools.

## Decision

We will implement code visualization using **Vue.js 3 with Vite**, deployed as **static files**.

**Architecture:**
```
┌─────────────────────┐
│   aina analyze      │ Python CLI (zero deps)
│   (Backend)         │
└──────────┬──────────┘
           │
           ▼ Generates JSON
┌─────────────────────┐
│  ~/.aina/analysis/  │ Data files
│  {name}.json        │
└──────────┬──────────┘
           │
           ▼ Loaded by
┌─────────────────────┐
│   Vue.js Frontend   │ npm run build → dist/
│   (Static files)    │
└─────────────────────┘
           │
           ▼ Open in browser
┌─────────────────────┐
│   file://index.html │ No server required
│   or localhost      │
└─────────────────────┘
```

**Technical stack:**
- Vue 3 (Composition API)
- Vite (build tool)
- D3.js (treemap layout algorithm)
- TypeScript (optional, gradual adoption)

**Development workflow:**
1. `aina analyze my-set` → generates `~/.aina/analysis/my-set.json`
2. `cd frontend && npm run dev` → development server
3. `npm run build` → static files in `dist/`
4. Open `dist/index.html` in browser (works with file:// protocol)

**Deployment model:**
- Static files can be opened directly (file://)
- Can be served from any static host (GitHub Pages, S3, etc.)
- No Python backend server required at runtime
- Analysis happens via CLI, frontend is pure visualization

## Consequences

**Positive:**
- **Rich interactivity**: Full reactive framework enables smooth zoom, filter, search without page reloads
- **Component architecture**: Reusable UI components (treemap, file browser, statistics panel)
- **Aligned with Product Brief**: Matches specified "Vue.js web application" technology choice
- **Ecosystem maturity**: Large library ecosystem (D3.js, visualization libraries)
- **No runtime backend**: Static files work offline, shareable, version-controllable
- **Developer experience**: Hot reload, Vue DevTools, strong TypeScript support
- **Future-proof**: Easy to add advanced features (time-series, comparisons, filtering)

**Negative:**
- **Build tooling required**: npm/node ecosystem added to project (separate from Python CLI)
- **Two-language stack**: Python for analysis backend, JavaScript for frontend
- **Build step overhead**: `npm run build` required before sharing static files
- **Larger artifact size**: Vue bundle + D3.js (~200-300KB gzipped vs ~50KB for vanilla JS)
- **Learning curve**: Contributors need Vue.js knowledge for frontend changes

**Neutral:**
- **Separation of concerns**: Analysis engine (Python) and visualization (Vue) are decoupled
- **Independent deployment**: Frontend can be updated without changing backend
- **Data contract**: JSON format is the interface between backend and frontend

**Migration path:**
- Start with basic treemap visualization (MVP)
- Add interactivity incrementally (drill-down, filters, search)
- Later opportunities can add advanced features (overlays, time-series, AI prompts)
- Static deployment can evolve to hosted service if needed

## Alternatives Considered

**Terminal-Native Visualization (Solution 1):**
- Rejected: Insufficient visual richness for treemap visualization
- WinDirStat-style interaction requires graphical interface
- Would not meet Product Brief requirement for shareable visual reports

**Static HTML Generator (Solution 2):**
- Rejected: Limited interactivity with vanilla JavaScript
- Complex interactions (zoom, pan, drill-down) become fragile without framework
- Treemap layout algorithm easier to maintain with D3.js than custom Python SVG generation

**React or Svelte instead of Vue:**
- Considered but rejected: Product Brief explicitly specifies Vue.js
- Vue matches workplace standard mentioned in brief
- Team familiarity with Vue reduces onboarding friction
