# FOURTH DOWN. — You're the Coach

**DSC 106 · Fall 2026 · UC San Diego**  
**Eugene Bertrand · Davis Do · Andrew Xia**

An interactive explorable explanation about NFL fourth-down decisions. The visitor acts as a coach: configure a fourth-down situation, choose to go for it, punt, or kick a field goal, and see how NFL teams actually behaved in comparable recorded situations.

## What works in this initial prototype

- **Interactive D3 football field** — click the turf, use arrow keys while the field is focused, or drag the field-position slider to move the ball, line of scrimmage, and line to gain.
- **Coach's challenge** — choose one of three football decisions and reveal the evidence.
- **Interactive controls** — adjust yards to go (1–15), field position, and quarter (Q1–Q4).
- **Decision distribution** — a real-data D3 bar chart showing counts and percentages for attempts, punts, and field goals in comparable situations.
- **Fourth-down heatmap** — real-data D3 visualization of how frequently teams went for it by position, distance and quarter; click a cell to jump into that scenario.
- **Sample-size and matching transparency** — exact matching-play count, search-window annotations, and a warning when samples are small.
- **Required prototype reflections** — both four-plus-sentence sections are on the webpage.
- **GitHub Pages ready** — static HTML, CSS and JavaScript, no build system required.

The field and challenge work without the data file. The archive now **includes the real CSV**, so charts will load automatically when hosted on GitHub Pages or a local HTTP server. If no CSV is available, the visualizations remain in a clearly labeled empty state; no NFL observations are invented.

## Dataset: already included and tested

**This updated archive includes `2026_plays.csv`**, supplied from the project's Kaggle link. The webpage auto-loads it at `./2026_plays.csv` when run from a server or GitHub Pages. The site also offers an optional **LOAD CSV** button to use a local replacement file.

The original Kaggle file has **30,899 rows** and a custom schema (`PlayStart`, `PlayOutcome`, `TeamWithPossession`, `Quarter`, `Week`, etc.). The parser is now designed for these exact fields and also retains support for conventional NFL play-by-play columns.

From the uploaded snapshot, the parser identifies **1,921 usable fourth-down decisions** in **2026 regular-season Weeks 1–9**: **374 go-for-it attempts, 1,028 punts, 519 field-goal attempts**. It excludes preseason/Hall of Fame games, non-plays and unknown outcomes. For the method and excluded-row counts, see [`DESIGN_NOTES.md`](./DESIGN_NOTES.md).

### What counts as a fourth-down decision?

| Category | Typical play types |
|---|---|
| Go for it | pass, run, rush, QB sneak, scramble, sack, fake punt/FG |
| Punt | punt |
| Field goal | field goal, FG attempt |

The site counts fourth-down plays from **2026 Weeks 1–9** when those columns are available. It excludes non-plays, unknown categories, rows with missing context, and overtime. If the file does not have a `week` column, it cannot verify the Week 1–9 scope and instead labels the result *available rows*.

**Field coordinate convention:** `yardline_100` counts yards **remaining to the opponent's goal**, so the app converts it to offensive progress with `100 - yardline_100`; `los` counts forward from the offense's own goal line. A bare numeric `yard_line` (e.g. `42`) is ambiguous without field-side information, so it is not guessed.

## Run locally

Because browsers may block `fetch` when a page is opened via `file://`, start a tiny local server from this folder:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000/**. An internet connection is needed for the D3 v7 CDN and Google Fonts. (You can use the LOAD CSV button if you open `index.html` directly.)

Optional data parser sanity check (requires Node.js):

```bash
node test-data-utils.js
```

This test uses tiny *synthetic fixtures strictly for unit testing*. The website does **not** use those fixtures and does **not** claim they are real NFL plays.

## Put it on GitHub Pages

1. Create a new **public** repository named `fourth-down-explorer`.
2. Upload or push everything here, including `index.html` and the real `2026_plays.csv` if it fits GitHub's file limits.
3. In your GitHub repository, go to **Settings → Pages → Build and deployment**.
4. Choose **Deploy from a branch**, `main`, and `/(root)`. Save.
5. Open the published URL shown in Pages settings. It will normally look like `https://YOUR-USERNAME.github.io/fourth-down-explorer/`.
6. Test the published page in a private/incognito browser window and check that the CSV has loaded and the controls and charts work.
7. Submit **the GitHub Pages URL** (not just the repo URL) on Gradescope for the prototype.

If you already created an empty repo and want to push from your computer:

```bash
git init
git add .
git commit -m "Build interactive fourth-down prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fourth-down-explorer.git
git push -u origin main
```

If you already cloned your repo, **do not** run `git init` or `git remote add origin` again: simply copy these files into that folder, then use `git add .`, `git commit`, and `git push`.

## Files

| File | What it does |
|---|---|
| `index.html` | Site content, panels, controls, reflections |
| `style.css` | Responsive design, accessibility, typography |
| `script.js` | D3 football field, bar chart, heatmap, event handlers, CSV loading |
| `data-utils.js` | CSV column mapping, fourth-down classification, filters, sample summaries |
| `test-data-utils.js` | Optional local unit tests; never runs in production |
| `.nojekyll` | Prevents GitHub Pages from invoking Jekyll |
| `DESIGN_NOTES.md` | Lecture concepts, visual-encoding rationale, data audit, evaluation plan |
| `2026_plays.csv` | **Included**; user-supplied original Kaggle download |

## Data logic and interpretation

The site compares the selected **quarter**, **field position within ±12 yards**, and **yards to go within ±2**. If fewer than eight plays match, it expands to **±20 field yards and ±4 yards to go**, still in the same quarter. Both the actual sample size and the expanded window are shown next to the chart. If no matches exist, it says so instead of displaying a fake prediction.

Each heatmap cell bins field progress into 10-yard intervals and yards to go into `1`, `2–3`, `4–5`, `6–7`, `8–10`, or `11–15`. The color is the *observed share of fourth-down plays that attempted to convert*. Cells with fewer than five observations show no percentage, because the estimate would be particularly unstable.

### Interpretation caveat

Coaches do **not** face random situations. These data are observational, not evidence of a causally optimal play. Decision differences could reflect score, clock, weather, roster, opponent, and team style; most are not yet part of the filters. The raw 2026 data and a subset of its rows have been checked, but any specific published takeaway should still be verified against the source records.

## How to make the final submission excellent

The November 18 **initial prototype** rubric is a completeness rubric totaling three points. It does **not** have an “Excellent” tier. The December 9 **final deliverables** rubric does. After the prototype, prioritize:

1. **Real finding:** identify a surprising relationship in the actual dataset and craft an opening hook around it.
2. **Editorial narrative:** frame the story as "You might expect X, **but** real fourth-down choices show Y, **therefore** context matters." Use real counts and annotations — never invent the finding beforehand.
3. **Thoughtful encodings:** explain the meaning of color, sample sizes, and field-direction labels; distinguish observed attempt rate from conversion success.
4. **More context if supported by data:** score differential, game clock, team, and conversion outcomes. Validate all columns first.
5. **Accessibility + polish:** keyboard-test the heatmap, test on laptop and mobile, and have classmates try the challenge without instructions.
6. **Demo video (≤2 minutes):** hook, motivation, interaction demonstration, and a clear evidence-based takeaway. Final webpage must link or embed the video.

## Acknowledgments

- Data: [Kaggle NFL Game Scores Dataset](https://www.kaggle.com/datasets/keonim/nfl-game-scores-dataset-2017-2023/data?select=2026_plays.csv) (as provided in the project proposal).
- Visualization library: [D3.js v7](https://d3js.org/).
- Project assignment: [DSC 106 Final Project](https://dsc106.com/projects/final_project/).
