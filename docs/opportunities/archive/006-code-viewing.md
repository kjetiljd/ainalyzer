# Opportunity: Code Viewing from Treemap

**Status:** Identified
**Last Updated:** 2025-11-24
**Parent:** 002 (Code Visibility)

## Desired Outcome

Users can view actual source code when clicking on file nodes in the treemap, enabling quick code inspection without leaving the visualization.

## Opportunity (Problem Space)

**Current State:**
- Treemap shows file names, sizes, and metadata
- Clicking files drills down (but files are leaf nodes with no children)
- No way to view actual code content
- Must open files in external editor to read code
- Context switch breaks exploration flow

**Impact:**
- Interrupts exploration workflow (switch to IDE/editor)
- Cannot quickly verify what's in a file
- Slows down code reconnaissance and understanding
- Cannot answer "what does this file do?" without leaving tool
- Loss of spatial context when opening external editor

**User Needs:**
- Quick code preview during treemap exploration
- Understand file contents without context switching
- Verify assumptions about what code lives where
- Read code while maintaining treemap context
- Syntax highlighting for readability

## Solutions (Explored)

### Solution 1: Modal Overlay with Syntax Highlighting

**Philosophy:** Keep user in treemap context. Quick preview, easy dismiss.

**Approach:**
- Click file node opens modal overlay (80% viewport)
- Fetch file contents from analysis or filesystem
- Render with syntax highlighting (highlight.js or Prism)
- ESC key or click outside to close
- Modal shows: filename, path, line count, language

**Implementation:**
```vue
<template>
  <div v-if="showCodeViewer" class="code-modal" @click.self="closeViewer">
    <div class="code-modal-content">
      <header>
        <h2>{{ currentFile.name }}</h2>
        <span class="file-path">{{ currentFile.fullPath }}</span>
        <span class="file-stats">{{ currentFile.lines }} lines • {{ currentFile.language }}</span>
        <button @click="closeViewer">✕</button>
      </header>
      <pre><code :class="`language-${currentFile.language}`" v-html="highlightedCode"></code></pre>
    </div>
  </div>
</template>
```

**Data Source Options:**
- **Option A:** Store code in analysis JSON (bloats file size)
- **Option B:** Fetch from filesystem via API endpoint (requires backend route)
- **Option C:** Read directly from disk in Vite dev mode (dev-only feature)

**Benefits:**
- Minimal context switch (overlay, not new page)
- Treemap remains visible in background
- Fast to implement with existing libraries
- ESC key for quick close
- Familiar modal pattern

**Trade-offs:**
- Requires file reading capability (backend API or extended analysis)
- Large files may be slow to render
- Syntax highlighting adds bundle size (~50-100KB)
- Modal blocks full treemap view

---

### Solution 2: Split View with Persistent Code Panel

**Philosophy:** Dual-pane interface. Treemap for navigation, code panel for reading.

**Approach:**
- Layout: 50/50 or 60/40 split (adjustable divider)
- Left pane: Treemap
- Right pane: Code viewer
- Click file updates right pane
- Resize divider or collapse code panel
- Code panel shows: file tabs (if multiple files opened), line numbers, syntax highlighting

**Layout:**
```
┌──────────────────┬────────────────────┐
│                  │  filename.py       │
│                  │  ───────────────   │
│                  │   1  import os     │
│   Treemap        │   2  import sys    │
│                  │   3                │
│                  │   4  def main():   │
│                  │   5      pass      │
│                  │  ...               │
└──────────────────┴────────────────────┘
```

**Benefits:**
- Persistent code viewing (no modal dismiss)
- Can reference treemap while reading code
- Natural for side-by-side comparison
- Resizable panes for user preference
- Can keep multiple files open (tabs)

**Trade-offs:**
- Reduces treemap space (less effective on small screens)
- More complex layout management
- May feel cluttered
- Requires responsive design for mobile

---

### Solution 3: External Editor Integration

**Philosophy:** Leverage existing tools. Don't reinvent code viewing.

**Approach:**
- Click file opens in default system editor or IDE
- Use custom URL schemes:
  - VS Code: `vscode://file/absolute/path/to/file.py`
  - Sublime: `subl://open?url=file://...`
  - Generic: `file:///absolute/path/to/file.py`
- Option: Add "Open in Editor" button on hover/right-click

**Benefits:**
- Zero implementation (just URL generation)
- Users already have preferred editor with themes, extensions
- Full editor capabilities (search, navigate, edit)
- No bundle size increase
- Works offline

**Trade-offs:**
- Complete context switch (leaves browser)
- Requires protocol handlers configured
- May not work in all environments (sandboxed browsers)
- No integration with treemap exploration
- Loses spatial context

---

### Solution 4: Inline Expansion with Code Preview

**Philosophy:** Expand cells in place. Code preview as part of treemap.

**Approach:**
- Click file node expands cell to show first 10-20 lines
- Cell grows to accommodate code (pushes other cells)
- Click again or click outside to collapse
- Show "View full file" link if truncated
- Minimal styling (no full syntax highlighting, just monospace)

**Benefits:**
- Stays within treemap context
- No separate UI component
- Quick preview without modal
- Feels integrated with visualization

**Trade-offs:**
- Breaks treemap layout when expanded
- Limited space for code (can't show full file)
- May be visually jarring (expanding cells)
- Difficult to implement with D3 treemap layout
- Poor readability for longer files

---

### Solution 5: Tooltip with Code Snippet

**Philosophy:** Minimal intrusion. Show just enough to identify file purpose.

**Approach:**
- Hover shows tooltip with first 5-10 lines of code
- Styled like existing statusline but larger
- Syntax highlighting optional
- Click file opens in external editor (Solution 3)
- Tooltip positioned near cursor (not blocking treemap)

**Benefits:**
- Lightest touch (hover, not click)
- No layout disruption
- Quick peek without commitment
- Can still use click for external editor

**Trade-offs:**
- Very limited code viewing (snippet only)
- Hover can be unstable (mouse movement dismisses)
- Not suitable for reading full files
- Still requires external editor for deep reading

---

## Comparison Matrix

| Criterion | Modal | Split View | External | Inline | Tooltip |
|-----------|-------|------------|----------|--------|---------|
| Context preservation | High | High | Low | Medium | High |
| Code readability | High | High | Highest | Low | Medium |
| Implementation complexity | Medium | High | Low | High | Low |
| Screen space usage | Medium | High | Low | Medium | Low |
| Mobile friendly | Good | Poor | Good | Fair | Fair |
| Full file viewing | Yes | Yes | Yes | No | No |
| Syntax highlighting | Yes | Yes | Editor | No | Optional |

## Recommendation

**Start with Solution 1 (Modal Overlay)** for MVP:
- Best balance of context preservation and readability
- Familiar UX pattern
- Works on mobile
- Can iterate to Solution 2 (split view) later if needed

**Implementation Path:**
1. Add backend API endpoint: `GET /api/file-content?path=<relative-path>`
2. Create CodeViewer.vue component (modal)
3. Integrate highlight.js (lightweight syntax highlighting)
4. Handle file clicks in Treemap.vue (emit 'view-code' event)
5. Add keyboard shortcuts (ESC to close, arrow keys for next/prev file)

**Future Enhancement:**
Add "View in Editor" button in modal (combines Solution 1 + Solution 3)

## Implementation Plan

**Phase 1: Backend API** (Estimated: 1-2 hours)
- [ ] Add `GET /api/file-content` endpoint to Vite config
- [ ] Read file from disk (relative to analysis set root)
- [ ] Return JSON: `{ path, content, language, lines }`
- [ ] Handle errors (file not found, permission denied)

**Phase 2: CodeViewer Component** (Estimated: 2-3 hours)
- [ ] Create `CodeViewer.vue` component
- [ ] Modal overlay with backdrop
- [ ] Header: filename, path, stats, close button
- [ ] Code display area with scrolling
- [ ] Integrate highlight.js for syntax highlighting
- [ ] ESC key handler to close
- [ ] Loading state while fetching

**Phase 3: Treemap Integration** (Estimated: 1 hour)
- [ ] Update Treemap.vue click handler to distinguish files vs directories
- [ ] Emit 'view-code' event with file metadata
- [ ] Wire up CodeViewer in App.vue
- [ ] Pass file path and analysis set info

**Phase 4: Polish** (Estimated: 1-2 hours)
- [ ] Add "Copy path" button
- [ ] Add "Open in editor" button (vscode:// link)
- [ ] Keyboard navigation (next/prev file in tree)
- [ ] Responsive design for mobile
- [ ] Loading spinner for large files

**Testing Strategy:**
- Test with small files (<100 lines)
- Test with large files (>10,000 lines) - may need virtual scrolling
- Test with binary files (should show error message)
- Test with missing files (deleted after analysis)
- Test modal close interactions (ESC, backdrop click, button)

**Success Metrics:**
- Modal opens in <200ms for files <5000 lines
- Syntax highlighting works for common languages (JS, Python, Java, etc.)
- ESC key dismisses modal reliably
- No memory leaks when opening/closing multiple files

## Dependencies

**Blocks:** None
**Blocked by:** None (can implement immediately)

**Libraries to Consider:**
- `highlight.js` - 50KB min, supports 190+ languages
- `prism.js` - 20KB core, modular language support
- `shiki` - 3MB (large), perfect highlighting but heavy
- `monaco-editor` - Full VS Code editor (heavy, 2MB+)

**Recommendation:** Start with Prism (lighter, good enough), upgrade to Shiki if needed.

## Notes

- This opportunity assumes analysis JSON stores relative file paths
- Backend API must resolve paths safely (prevent directory traversal)
- Consider caching file contents in browser (localStorage) for frequently viewed files
- Large files (>100KB) may need streaming or pagination
- Binary files should show "Binary file - cannot preview" message

## Alternative: Git Integration

If analysis includes Git metadata, could show:
- File blame inline
- Recent commits affecting file
- Authors who touched file most

This would require Git integration (future opportunity).
