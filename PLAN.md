# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Color by File Type (010)** - TDD Implementation Plan

→ [docs/opportunities/010-color-by-filetype.md](./docs/opportunities/010-color-by-filetype.md)

### Phase 1: colorUtils.js (Pure Functions)

**Tests first:** `frontend/src/__tests__/colorUtils.test.js`

```
1. PALETTE_60 exports 60 colors
2. PALETTE_60[0-19] matches Classic_20 exactly
3. simpleHash returns consistent values for same input
4. simpleHash returns different values for different inputs
5. assignColors returns object mapping languages to colors
6. assignColors assigns most frequent language first
7. assignColors handles collision with tier escalation (slot → slot+20 → slot+40)
8. assignColors salts and rehashes when all 3 tiers exhausted
9. assignColors returns gray (#7f7f7f) for overflow (60+ languages)
10. assignColors is deterministic (same input → same output)
11. Empty languageCounts returns empty colorMap
```

**Then implement:** `frontend/src/utils/colorUtils.js`
- BASE_HUES array (10 hues with HSV parameters)
- hsvToHex() conversion
- generatePalette() → PALETTE_60
- simpleHash(str) → number
- assignColors(languageCounts) → colorMap

### Phase 2: Preferences (colorMode)

**Tests first:** Add to `frontend/src/__tests__/usePreferences.test.js`

```
12. Default colorMode is 'depth'
13. Loads colorMode from localStorage
14. Overrides colorMode with URL param ?colorMode=filetype
15. Includes colorMode in URL when not default
16. Resets colorMode to default
```

**Then implement:** Update `frontend/src/composables/usePreferences.js`
- Add `colorMode: 'depth'` to appearance defaults
- Add URL param handling for colorMode
- Add to updateURL() and shareCurrentView()

### Phase 3: SettingsPanel (Radio Buttons)

**Tests first:** Add to `frontend/src/__tests__/SettingsPanel.test.js`

```
17. Renders radio buttons for color mode
18. Radio reflects current colorMode preference
19. Selecting 'filetype' updates preference
20. Updates URL when colorMode changes
```

**Then implement:** Update `frontend/src/components/SettingsPanel.vue`
- Add radio button group for color mode
- Wire to preferences.appearance.colorMode

### Phase 4: Treemap Integration

**Tests first:** Add to `frontend/src/__tests__/Treemap.test.js` (may need to create)

```
21. Treemap accepts colorMode prop
22. colorMode='depth' uses existing depth-based coloring
23. colorMode='filetype' computes colorMap from data
24. colorMap is computed once from root data (not currentNode)
25. getNodeColor returns colorMap color when colorMode='filetype'
26. Directories remain gray (#4a4a4a) in filetype mode
27. Unknown language falls back to gray
```

**Then implement:** Update `frontend/src/components/Treemap.vue`
- Add colorMode prop
- Add computed colorMap (calls assignColors when colorMode='filetype')
- Update getNodeColor() to check colorMode
- Count languages from this.data (root), not currentNode

### Phase 5: App Integration

**Implementation only** (wiring, no new logic):
- Pass colorMode from preferences to Treemap
- Verify settings panel toggle works end-to-end

### Verification

- [ ] All 27+ tests pass
- [ ] Manual test: switch between depth/filetype modes
- [ ] Manual test: colors stable across navigation in filetype mode
- [ ] Manual test: preference persists after reload
- [ ] Manual test: URL ?colorMode=filetype loads correctly

---

## Next

1. **Change pattern awareness** - Hidden hotspots and change frequency buried in Git history
   - Git history overlays for treemap
   - Integration with Code Maat for churn analysis
   - Color-coded visualization of change hotspots

2. **Codebase comprehension** - Teams need AI assistance to understand unfamiliar code areas
   - AI-powered prompt toolkit
   - Pattern discovery and architecture insights
   - Natural language exploration of analysis data

---

## Later

**Refactor aina_lib.py to improve cohesion** (paused)
- OO redesign: Database class done, remaining phases: RepositoryScanner, ClocRunner, TreeBuilder, Analyzer, AnalysisIndex
- Maintain 21 passing tests

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Git history analysis (Code Maat integration)
- Metric overlay system
- AI interpretation toolkit
- Activity metrics
- Performance optimization
