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
| VoiceOver on macOS Safari, and on iPhone | Navigate each view by headings, then by tables; open a bug's history | Headings describe each panel; tiles read as title, number, explanation; tables announce headers; the dialog announces its title | Not tested |
| Keyboard only, whole journey | Unplug the mouse: change each filter, switch views, open and close three bug histories, open "How it's counted" notes | Everything reachable, in a sensible order, with no traps | Not tested (partly covered by the automated focus test) |
| Focus order and visibility | Tab through each view at 1280px and 390px | The order follows the layout; the indicator is visible on every background, in light and dark mode | Not tested by a person |
| Dialog focus | Open a bug history, Tab repeatedly, then Shift+Tab | Focus stays in the dialog until it's closed, then returns to the bug ID | Partly verified (return of focus is automated) |
| Screen reader announcements | Change a filter with VoiceOver on | The updated view is announced once, not the whole page every time | Not tested |
| 200% browser zoom | Zoom to 200% in Chrome, Safari and Firefox on a 1280px window | No text cut off, no sideways scrolling, nothing overlapping | Not tested (narrow-width tests are a proxy, not the same thing) |
| Mobile layout on a real phone | iPhone Safari and an Android phone, portrait and landscape | Tables become cards, filters don't zoom the page, nothing needs sideways scrolling | Not tested on a device |
| Status without colour | Use a greyscale filter, or read the page as text | Every status (On track, Watch, Off track, Overdue) is readable from its words | Not tested by a person (every status has a text label by design) |
| Charts without sight | With VoiceOver, read each chart's text alternative and table | The numbers and the point of the chart come across without the picture | Not tested |

When these are done, record the date, browser and version, and what was found, here.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
