# Rage Gait Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Rage Gait newsletter website (opening animation, archive table with hover banners, issue pages, Kit subscribe form) and publish it on GitHub Pages.

**Architecture:** Plain static files. `issues.js` holds the issue data; `script.js` builds the archive table from it and runs the intro; each issue is its own HTML page copied from a template. Shared header and styles live in `style.css`.

**Tech Stack:** HTML, CSS (Grid, transitions), vanilla JS, Kit embed form, GitHub Pages. No frameworks, no build step, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-rage-gait-website-design.md`

## Global Constraints

- Plain HTML/CSS/vanilla JS only; no installs.
- Header items, in order: archive, about us, upcoming projects, contact, resources, subscribe.
- Archive columns: title, issue number, date, word count.
- Banners are 1200x400 (3:1). Placeholder: `banners/issue-06.jpg`.
- Style: bold sans-serif, black on white, minimal, 6-column grid.
- Beginner-friendly code: simple, short comments on non-obvious parts. After each task, explain new concepts in plain language and name each new concept in one line.
- Each task ends with something the owner can open in the browser and check (open `index.html` directly; no server needed).

## Review Focus

- Empty archive (`issues = []`): table shows only the header row, no JS error.
- Issue with a missing banner: row still renders, hover shows nothing instead of a broken image.
- Narrow/mobile screen: the 6-column header and table must not overflow sideways.
- Visitor with "reduce motion" enabled: the intro skips the drifting animation and goes straight to the main page.
- Direct visit to an issue page or other page (no intro): header still works and links back to the archive.
- Very long issue title: wraps inside its column instead of breaking the grid.

---

### Task 1: Skeleton, grid and header

**Files:** Modify `index.html`, `style.css`

**Interfaces:**
- Produces: `<header class="site-header">` containing a `<nav>` with 6 links; `<main id="archive">`; CSS variables `--black`, `--white`, `--yellow`, `--gap`; class `.grid` (6 equal columns via `repeat(6, 1fr)`).

- [ ] **Step 1:** Replace the starter placeholder boxes with the semantic skeleton (`header`, `nav`, `main`). Nav links in the order from Global Constraints.
- [ ] **Step 2:** In `style.css`, define the CSS variables and the `.grid` class; lay the nav out on it, removing the pink/blue starter colors.
- [ ] **Step 3:** Verify: open `index.html`; 6 header items sit evenly in 6 columns, nothing overflows when the window is narrowed to phone width (header may wrap but never scrolls sideways).

### Task 2: Typography and look

**Files:** Modify `style.css`

- [ ] **Step 1:** Set the page font to a bold Helvetica-style stack (`"Helvetica Neue", Helvetica, Arial, sans-serif`), black on white, small tight text, no underlines on nav links, small `padding` on `body`.
- [ ] **Step 2:** Verify: the page matches the archivio-uno feel (flat, bold, no decoration). Show the owner and adjust sizes together.

### Task 3: Archive table from data

**Files:** Create `issues.js`, `script.js`; Modify `index.html` (add `<script>` tags before `</body>`, `issues.js` first), `style.css`

**Interfaces:**
- Produces: global `const issues = [{ title, number, date, wordCount, banner }]` in `issues.js`; `buildTable(issues: Array) -> void` in `script.js`, which fills `<main id="archive">` with one `.row` per issue on the 6-column grid (columns: title spans 3, number 1, date 1, word count 1) preceded by a header row.
- `issues.js` initially contains the issue 6 placeholder (`banner: "banners/issue-06.jpg"`).

- [ ] **Step 1:** Create `issues.js` with the issue 6 entry (date "September 25th", realistic placeholder title and word count the owner can edit).
- [ ] **Step 2:** Implement `buildTable` with `forEach` and `createElement`; call it on page load. Missing banner → row gets no banner element.
- [ ] **Step 3:** Style header row and rows (thin black bottom border, wrap long titles within their column).
- [ ] **Step 4:** Verify: placeholder issue appears as a row; set `issues = []` temporarily and confirm only the header row shows with no console error; add a second fake issue and confirm it appears; remove the fake.

### Task 4: Hover-to-expand banner

**Files:** Modify `script.js` (`buildTable` adds the banner `<img>` inside each row), `style.css`

**Interfaces:**
- Consumes: `buildTable` and the `.row` structure from Task 3.
- Produces: `.row .banner-wrap` (hidden by default, `max-height: 0`, `overflow: hidden`, `transition: max-height 0.4s`) that expands to the 3:1 banner height on `.row:hover`.

- [ ] **Step 1:** Add the banner `<img>` (`loading="lazy"`, `alt` = issue title) inside a `.banner-wrap` in each row.
- [ ] **Step 2:** CSS: collapsed by default; on `.row:hover` set `max-height` to the banner's height at full width (use `aspect-ratio: 3 / 1` on the image so no pixel math is needed).
- [ ] **Step 3:** Verify: hovering the issue 6 row opens the banner smoothly; moving the mouse away collapses it; the rest of the table shifts down and back without jumping.

### Task 5: Issue page template and highlight links

**Files:** Create `issues/issue-template.html`, `issues/issue-06.html`; Modify `style.css`, `issues.js` (add `url` field to each entry), `script.js` (title cell becomes a link to `url`)

**Interfaces:**
- Consumes: shared header markup from Task 1 (copied; paths adjusted with `../`).
- Produces: `.article` (full-width text container); `.article a` styled as highlight: `background: var(--black); color: var(--white); box-decoration-break: clone; -webkit-box-decoration-break: clone;`.

- [ ] **Step 1:** Create the template (header, issue title/number/date, a few paragraphs including one link) and copy it to `issue-06.html` with placeholder text.
- [ ] **Step 2:** Add the `.article` and highlight link styles to `style.css`.
- [ ] **Step 3:** Add `url: "issues/issue-06.html"` to the issue 6 entry; make the title cell a link.
- [ ] **Step 4:** Verify: clicking the title opens the issue page; the link highlight wraps cleanly across two lines (resize to confirm); header links return to the archive; a very long paragraph spans the full width.

### Task 6: Opening ASCII animation

**Files:** Modify `index.html` (add `<div id="intro">`), `script.js`, `style.css`

**Interfaces:**
- Produces: `startIntro() -> void` in `script.js`. Fills `#intro` with a full-screen grid of characters drifting downward (updated with `setInterval`, ~100ms), with "rage gait" centered. After 3 seconds, adds class `intro-done`, which moves the title to the top-left of the header and fades the intro out while the main page fades in.

- [ ] **Step 1:** Add `#intro` (fixed, full-screen, above everything) and hide the main page until the intro ends.
- [ ] **Step 2:** Implement the drifting character grid: a few ASCII characters (e.g. `. : ; | /`) arranged in rows; each tick shifts rows down one line. Characters count adapts to window size.
- [ ] **Step 3:** After 3000 ms add `intro-done`; CSS transitions move "rage gait" to the header's top-left and reveal the page.
- [ ] **Step 4:** Respect `prefers-reduced-motion`: if set, skip straight to the finished state.
- [ ] **Step 5:** Verify: reload shows the drifting animation with the title centered, then after 3 seconds the title lands top-left and the archive appears; with reduced motion on (macOS: System Settings → Accessibility → Display → Reduce motion) the page loads directly to the archive; visiting an issue page directly shows no intro.

### Task 7: Subscribe form (Kit)

**Files:** Modify `index.html` (and shared header on other pages), `style.css`

- [ ] **Step 1:** Owner copies the Kit form embed code from the Kit dashboard (Grow → Landing Pages & Forms → create/choose a form → Embed). Owner shares it.
- [ ] **Step 2:** The "subscribe" header item opens a small panel (a `<dialog>` or a hidden section toggled by the link) containing the Kit embed.
- [ ] **Step 3:** Verify: clicking "subscribe" shows the form; submit a test email; confirm it appears in the Kit subscriber list (then remove it); close control works; layout fine at phone width.

### Task 8: Remaining pages and publish

**Files:** Create `about.html`, `upcoming.html`, `contact.html`, `resources.html`; Modify `README.md`

- [ ] **Step 1:** Create the four pages from the template layout (same header, simple text placeholders for the owner to replace). Header links point to them; "archive" points to `index.html` and skips the intro when not on the first visit (intro only plays on `index.html`).
- [ ] **Step 2:** Verify: every header link works from every page.
- [ ] **Step 3:** Commit all work and push to `origin` (`git add`, `git commit`, `git push`); explain each command to the owner.
- [ ] **Step 4:** On GitHub: repo Settings → Pages → Source: Deploy from a branch → `main` / root → Save. Wait ~1 minute.
- [ ] **Step 5:** Verify: open `https://effieteffie.github.io/rage-gait/`; all pages, images and the form work (paths must be relative, not starting with `/`).
