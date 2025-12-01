# User Interview Report: Terje

**Date:** 2025-12-01
**Interviewer:** Kjetil
**Participant:** Terje (colleague, experienced developer)
**Duration:** ~45 minutes
**Format:** Remote screen share with think-aloud protocol

## Executive Summary

Terje successfully set up and used Ainalyzer to analyze a real project (S07240 - mobile order component). The session revealed several usability issues in the setup process, confirmed the tool's value for understanding codebase structure, and generated substantial feature ideas around change analysis and code navigation.

**Key Takeaways:**
1. Setup instructions need refinement (copy-paste blocks, clearer placeholders)
2. Change activity mode lacks depth - context lost when drilling down
3. Strong interest in cross-file change correlation and contributor analysis
4. Test/source file separation is a common mental model that the tool doesn't support
5. Escape key navigation expected but not working consistently

---

## Session Structure

1. **Demo phase** (~10 min): Interviewer demonstrated core features
2. **User trial** (~20 min): Participant set up tool from README
3. **Exploration** (~15 min): Free exploration with think-aloud feedback

---

## Setup Issues

### README Problems

| Issue | Severity | Action |
|-------|----------|--------|
| Prerequisites copy block includes comments that fail in bash | High | Remove inline comments or use valid bash syntax |
| `node --version` returns "invalid specification" with certain setups | Medium | Investigate node version detection |
| "myproject" placeholder unclear - user thought it was literal | High | Add explicit note: "Replace `myproject` with your chosen name" |
| Path requirement not obvious | Medium | Add example showing full command with actual path |

### Participant Quote
> "Du må kalle det, finne et navn, og så må du sette ta en path. Så det er også bra innspill."
> (You have to name it, find a name, and then set a path. That's good feedback.)

---

## Bug Reports

### 1. Escape Key Doesn't Close File Viewer (Critical)

**Expected:** Pressing Escape closes the file viewer modal
**Actual:** Escape does nothing when file viewer is open
**Impact:** Frustrating navigation, forces mouse use

> "Funker ikke escape? ... Så det å få lukket den hadde vært digg."

### 2. Change Count Not Shown in Default Mode

**Expected:** File tiles show change count in all modes
**Actual:** Change count only visible when "Change Activity" mode is selected
**Impact:** Users drilling into files miss change context

> "Det står ikke antall filendringer på midt på siden der, det burde det gjort."

### 3. "0 changes" Labeling Unclear

**Issue:** "0 changes" shown for files without changes in last year, but timeframe not obvious
**Impact:** User confusion about whether file is truly unchanged or just not recently changed

> "zero changes... Det er ikke pages hvis jeg har fått null... det er altså siste år. Ja. Så ting som er endringer, det har ikke vært rørt siste år. Men det er også uklart."

---

## Feature Requests

### High Priority (Frequently Mentioned)

#### 1. Change Context Preserved When Drilling Down

**Problem:** When in "Change Activity" mode and drilling into a directory, the change context is lost. Files inside don't show their change information.

> "Når jeg kommer inn her, så er det ingenting med endring på en måte. Sånn at jeg får ikke noe mer... den der endring, fordi jeg er i kontekst av endring, den er kun liksom fargekode neste her."

**Suggestion:** Maintain change visualization at all drill levels, possibly showing which parts of files changed.

#### 2. Cross-File Change Correlation

**Problem:** Can't see which files are typically changed together (coupling indicator).

> "Denne adressen er seks sju ganger... hvilke andre ting er det vi ofte har endret samtidig? Det hadde vært liksom en ting som har vært merverdi."

**Use case:** Understanding implicit dependencies and coupling between files.

#### 3. Contributor Count

**Problem:** Can't see how many different people have touched a file/area.

> "Det som kunne vært interessant er jo... å se hvor mange ulike bidragsytere har det vært."

**Use case:** Identifying knowledge silos, bus factor, code ownership patterns.

#### 4. Test/Source File Grouping

**Problem:** Test files and source files appear far apart in visualization due to Java's `main/` vs `test/` directory structure.

> "Testene ligger langt unna... V1 API test ligger langt unna V1 API... logisk sett når vi sitter og jobber med dem så er de veldig tett."

**Suggestion:** Option to merge `src/main` and `src/test` structures visually.

### Medium Priority

#### 5. Escape Key for Breadcrumb Navigation

**Suggestion:** Repeated Escape presses navigate up the breadcrumb path.

> "Escape at det implisitt også var å hoppe nedover i treet... kunne escape seg oppover i breadcrumben."

#### 6. Adjustable Time Range for Change Activity

**Current:** Fixed "last year" window
**Suggestion:** Slider or dropdown to adjust timeframe (3 months, 1 year, 2 years, all time)

> "I den der change activity, kunne det vært nyttig interessant å sett på liksom ikke bare siste året, men liksom justert dybden."

#### 7. Command Rename: `serve` to `show`

**Suggestion:** More intuitive command name.

> "Hadde jeg bedre om det het show eller noe sånn?"

### Lower Priority / Future Considerations

#### 8. Historical Trend Visualization

**Suggestion:** Graph showing change patterns over time (spikes in activity).

> "Det var mer sånn endringer som skjedde første måneden så var det veldig mye, og så flatet det ut igjen, og så kom det en ny bølge... liksom zoome inn på denne tidsperioden."

#### 9. Complexity Metrics

**Mentioned:** Interest in seeing complexity alongside size, though acknowledged correlation.

> "Noe med kompleksitet da... avhengigheter."

#### 10. In-File Change Visualization

**Suggestion:** When viewing a file, highlight which parts have changed.

> "Hadde det vært kult å så utmodellert liksom endringsmønsteret, hva har endret seg også inne i filen."

---

## Usability Observations

### Positive

| Feature | Observation |
|---------|-------------|
| File type exclusion | "Det var kjapt. Det var veldig nice." |
| File viewer | "Det å så lese og se på filer her sånn er jo ganske convenient" |
| Visualization clarity | Could identify layered architecture at a glance |
| Settings discoverability | User found and used settings without guidance |

### Needs Improvement

| Issue | Observation |
|-------|-------------|
| Single-level zoom | First click zooms to file, need another click to see content - feels like extra step |
| No internal navigation | Can't navigate to another file from file viewer |
| Unclear click behavior | Clicking a small tile (single file) vs. a directory has different implications |

---

## Use Case Clarification

### Primary Use Case (Confirmed)
Tech lead getting overview of codebase volume and structure across repositories.

> "Hovedutgangspunktet... en typisk tech lead går inn og prøver å få en oversikt over alt de har."

### Secondary Use Case (Emerging)
Understanding an inherited codebase.

> "Dette er jo prosjektet til liksom hun Hege har fått overlevert... hvordan kan jeg ha jobbet med dette for å fått en bedre forståelse av hva dette er."

### Not a Code Browser
Clear that the tool shouldn't try to replace IDE navigation.

> "Det er ikke egentlig en kode browser jeg har laget... det er ikke topp prioritet."

---

## Interpretation Challenges

Participant noted that the same data can be interpreted positively or negatively depending on context:

| Observation | Positive Interpretation | Negative Interpretation |
|-------------|------------------------|------------------------|
| High change count | Active development, responsive to needs | Buggy code, unstable |
| No changes | Stable, working code | Abandoned, no one knows it |

> "Tolkningen av dataene kan ikke bare bli innlåst... hvilket perspektiv du liksom ser det på."

**Implication:** Tool should avoid prescriptive color-coding (red=bad) and instead present neutral data.

---

## Technical Discussion Notes

### Performance Constraints

Explained the tradeoff between analysis depth and speed:
- Per-file git history with rename tracking is expensive
- Large repos (like COS) would take 17+ minutes for full analysis
- Current approach: Keep initial analysis fast, consider optional "deep analysis" mode later

> "Litt av det som jeg prøver å gjøre nå foreløpig i hvert fall, det er jo å prøve å holde den analysetiden nede."

### Contributor Tracking Complexity

- Co-author detection requires parsing commit messages
- Mob/pair programming attribution is tricky
- Pull request reviewers add another dimension

> "Noen bruker co-author... og da plutselig så eksploderer jobben."

---

## Action Items

### Immediate (Bugs)

- [ ] Fix Escape key not closing file viewer modal
- [ ] Show change count on file tiles in all modes (not just change activity)

### Short-term (Setup/UX)

- [ ] Refine README prerequisites (remove bash-incompatible comments)
- [ ] Add explicit placeholder instructions for `myproject`
- [ ] Consider renaming `serve` to `show`
- [ ] Implement Escape key breadcrumb navigation

### Medium-term (Features)

- [ ] Add adjustable time range for change activity
- [ ] Show contributor count per file/directory
- [ ] Preserve change context when drilling down

### Research/Design Needed

- [ ] Cross-file change correlation (which files change together)
- [ ] Test/source file grouping option
- [ ] Historical trend visualization

---

## Quotes Worth Preserving

On visualization value:
> "Du kan liksom se fargene da."

On structural insights:
> "Her ser jeg jo at det er et mønster... det tyder på at det er mye avhengigheter sannsynligvis."

On AI-assisted development:
> "Det er jo imponerende liksom. Du har sikkert brukt noen timer på det, men det er allikevel hvor mye features du får levert relativt kjapt."

---

## Appendix: Projects Analyzed During Session

1. **Adam Thornhill repos** (demo): Small, ~24k lines
2. **S07240 mobile-order** (user trial): Medium Java/Kotlin project
3. **Ainalyzer itself** (brief): ~3k lines

---

*Report generated from interview transcript. Raw transcript available at `/tmp/transcript-user-interview.md`*
