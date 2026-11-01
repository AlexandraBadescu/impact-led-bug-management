# Accessibility checklist

What's been checked on the demo dashboard, how, and what hasn't. Automated tools find roughly the problems a machine can see; they can't tell whether a screen reader user can actually make sense of a chart, or whether the page works at 200% zoom on a real laptop. So nothing here claims WCAG 2.2 AA conformance. It says what passed, and what's still to do.

**Statuses:** Verified (done, with the evidence named), Partly verified (some of it automated, the rest not done), Not tested.

## Automated, in this repo

| Check | Status | Evidence |
|---|---|---|
| axe-core WCAG 2.0, 2.1 and 2.2 A and AA rules, all 4 views, 8 widths (280 to 1280px), light and dark mode, with notes open | Verified (Chromium) | `tests/dashboard.test.js`, 64 tests |
| Reflow: no sideways scrolling at 280 and 320px, the width of a 1280px screen at 400% zoom | Verified (Chromium) | Same tests, plus text spacing at 320px |
| Text spacing (WCAG 1.4.12) | Verified (Chromium) | "text spacing" test |
| Focus indicator drawn on every keyboard stop on Today and This month | Partly verified | "visible focus indicator" test. It checks an outline is drawn, not that it's easy to see. It found and fixed one gap: the date field's calendar button had no indicator |
| Bug history dialog: opens with Enter, closes with Escape, focus returns to the bug ID | Verified (Chromium) | "bug history" test. Focus staying inside the dialog while open isn't tested |
| Every chart has a text alternative with its numbers, a legend and a "Show as a table" view | Verified (Chromium) | "every chart" test |
| Firefox | Verified in CI (layout and errors) | [CI run](https://github.com/AlexandraBadescu/impact-led-bug-management/actions/runs/41299093062), 1 November 2026. axe-core itself runs in Chromium only |
| Safari's engine (WebKit) | Verified in CI (layout, errors, filter alignment) | Same run |
| No sideways scrolling with a wide font, as on Linux | Verified (Chromium) | "wide font" test, added after CI found a 12px overflow at 280px that local runs missed |

## Manual, still to do

None of these have been done yet. Each says what to check and what passing looks like.

| Check | How | Pass when | Status |
|---|---|---|---|
| VoiceOver on macOS Safari, and on iPhone | Navigate each view by headings, then by tables; open a bug's history | Headings describe each panel; tiles read as title, number, explanation; tables announce headers; the dialog announces its title | Issues found, to fix in a future iteration (see below) |
| Keyboard only, whole journey | Unplug the mouse: change each filter, switch views, open and close three bug histories, open "How it's counted" notes | Everything reachable, in a sensible order, with no traps | Passed, 1 November 2026 (see below) |
| Focus order and visibility | Tab through each view at 1280px and 390px | The order follows the layout; the indicator is visible on every background, in light and dark mode | Not tested by a person |
| Dialog focus | Open a bug history, Tab repeatedly, then Shift+Tab | Focus stays in the dialog until it's closed, then returns to the bug ID | Partly verified (return of focus is automated) |
| Screen reader announcements | Change a filter with VoiceOver on | The updated view is announced once, not the whole page every time | Not tested |
| 200% browser zoom | Zoom to 200% in Chrome, Safari and Firefox on a 1280px window | No text cut off, no sideways scrolling, nothing overlapping | Partly verified: passed in Chrome and Safari; Firefox not yet checked at 200% (see below) |
| Mobile layout on a real phone | iPhone Safari and an Android phone, portrait and landscape | Tables become cards, filters don't zoom the page, nothing needs sideways scrolling | Not tested on a device |
| Status without colour | Use a greyscale filter, or read the page as text | Every status (On track, Watch, Off track, Overdue) is readable from its words | Not tested by a person (every status has a text label by design) |
| Charts without sight | With VoiceOver, read each chart's text alternative and table | The numbers and the point of the chart come across without the picture | Not tested |

When these are done, record the date, browser and version, and what was found, here.

## Results so far

**1 November 2026: VoiceOver on macOS, standalone preview of the dashboard branch.** A first pass found that some text isn't fully or clearly read: parts of the page run together and not all content is identified. These will be addressed in a future iteration. The likely causes, from inspecting the accessibility tree:

- The whole view is a live region, so it may be re-announced on load and after every filter change.
- Each tile's number is read as a separate bare paragraph, not tied to its heading.
- Short labels with no separator between them run together, for example "P0 Very high" or "P0 emergency Urgent".
- Decorative separators are read out, as in "·Developers".

Until then, this check stays failed, not passed.

**1 November 2026: 200% browser zoom in Chrome and Safari, standalone preview of the dashboard branch.** Passed: no text cut off, no sideways scrolling, nothing overlapping. Checked by Alexandra Badescu. Not yet repeated in Firefox.

**1 November 2026: Safari and Firefox on macOS, standard zoom, This month view.** Found an overlap in both: in "Known urgent bugs accepted at go-live", the narrow "Promised" column wrapped the status pill ("Not done: 9 days overdue") across lines, and the pieces drew over each other. Bug IDs also broke at the hyphen ("BUG-" / "111"). Fixed: pills now wrap as one box, IDs don't break, and the column has a minimum width. A new automated test checks that every status pill, impact tag and priority badge draws as one box, on all views at 390, 1024, 1280 and 1600px. It reproduced the problem in Chromium at 1024px before the fix. Still to confirm: re-checking in Safari and Firefox by a person.

**1 November 2026: keyboard only, standalone preview of the dashboard branch.** Passed: everything reachable, in a sensible order, with no keyboard traps. Checked by Alexandra Badescu. The separate focus order and visibility check (both widths, light and dark mode) and the dialog focus check are recorded on their own rows.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
