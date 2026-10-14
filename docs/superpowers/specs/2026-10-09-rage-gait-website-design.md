# Rage Gait Website: Design

## Purpose
A website for Gülnisa's email newsletter, Rage Gait (45 subscribers). Banner design by Onur Pelin; HTML/CSS by the repo owner. Hosted free on GitHub Pages. Inspired by archivio-uno.com: minimal, bold, black on white, table-style archive.

The repo owner is a beginner learning web design, so each build step is small, explained, and checked in the browser before moving on.

## Constraints
- Plain HTML, CSS and vanilla JS. No framework, no build step, no dependencies.
- Static files only (GitHub Pages).
- Subscriptions go through Kit (existing mail platform) using its embeddable form.

## Pages
1. **Opening + archive (`index.html`)**
   - Opening: full-screen ASCII animation drifting slowly downward, "rage gait" centered. After 3 seconds the title moves to the top-left of the header and the main page appears.
   - Header bar, 6 items: archive, about us, upcoming projects, contact, resources, subscribe.
   - Archive: 6-column minimal grid layout. Table of recent issues with columns: title, issue number, date, word count.
   - Hover on an issue row expands it to show that issue's banner; it collapses when the mouse leaves.
2. **Issue pages (`issues/issue-NN.html`)**: full-width text; links styled as black highlight blocks (white text on black, wrapping cleanly across lines).
3. **Other pages**: about us, upcoming projects, contact, resources (simple pages sharing the header and styles).
4. **Subscribe**: Kit embed form (code pasted from the Kit dashboard).

## Structure
```
rage-gait/
├── index.html
├── style.css
├── issues.js        one entry per issue: title, number, date, wordCount, banner
├── script.js        intro animation, table building, hover expand
├── issues/issue-NN.html
├── about.html, upcoming.html, contact.html, resources.html
└── banners/
```

## Adding an issue
Copy the issue template, write the text, add the banner image, add one entry to `issues.js`.

## Build order
1. Page skeleton + 6-column CSS Grid + header
2. Typography and visual style (CSS variables)
3. Archive table built from `issues.js`
4. Hover-to-expand banner
5. Issue page template with highlight links
6. Opening ASCII animation
7. Kit subscribe form
8. Remaining pages, then publish via GitHub Pages

## Out of scope (for now)
Sorting/search/filter on the archive, a markdown build step, a CMS, analytics.

## Open items
- Banners from Onur, and issue content, to be supplied by the owner.
- Kit embed code to be copied from the Kit dashboard in step 7.

## Banners
- Size: 1200x400 (3:1). Placeholder: `banners/issue-06.jpg` (yellow dog, "rage gait / ISSUE6 / September 25th").
- Shown at full table width on hover, keeping the 3:1 ratio so the row expands smoothly.
