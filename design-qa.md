# Theme Step Track Design QA

- Source visual truth: `C:/Users/SOYOON~1/AppData/Local/Temp/codex-clipboard-7bc61311-efe5-4fe6-be20-e15bf095f0d9.png`
- Browser-rendered implementation: `output/theme-chick-purchase-counts/01b-three-of-eleven-step-track.png`
- Combined comparison evidence: `output/theme-step-track/reference-vs-implementation.png`
- Official web-game client evidence: `output/theme-step-track/official-client/shot-0.png`, `state-0.json`
- Viewport: 480 × 1000 CSS px, device scale factor 1
- Source dimensions: 2048 × 433 px
- Implementation dimensions: 480 × 1000 px; focused track region 415 × 87 px normalized to 480 × 101 px
- State: Wood theme, 3 of 11 parts owned

## Full-view comparison evidence

- The 11-step track fits within the half-height theme sheet without horizontal scrolling.
- The restaurant remains visible above the sheet and the theme-part grid remains usable below it.
- The total-purchase effect remains directly below the track.

## Focused comparison evidence

- The source and implementation are shown together in `output/theme-step-track/reference-vs-implementation.png`.
- Both use a single dark horizontal rail, lime completed segment, circular numbered steps, three enlarged chick portrait milestones, and a top-right `3 / 11` counter.
- The source sample places portraits at 3/7/11; the implementation intentionally uses the game's real conditions 4/8/11. Stone uses its always-available chick at step 1 and the remaining milestones at 8/11.

## Required fidelity surfaces

- Typography: large bold current count and compact high-contrast step numerals match the reference hierarchy.
- Spacing and layout rhythm: eleven evenly distributed nodes and larger portrait rings remain legible at 480 px without overlap.
- Colors and tokens: completed steps use lime; future steps and rail use dark brown; cream background follows the existing theme panel.
- Image quality and asset fidelity: all portrait nodes use the project's real guest assets; no substitute character art is used.
- Copy and content: only the `현재 / 전체` counter is visible in the track; names and exact unlock conditions remain in accessible labels and tooltips.

## Interaction and regression checks

- At 0/11 no regular-theme milestones are active.
- At 4/11, 8/11, and 11/11 the corresponding portrait rings turn lime and the rail advances to the correct node.
- Future chick portraits remain visible in color with a dark border, matching the reference preview behavior.
- Theme/codex separation, completion bonus, half-sheet layout, individual installation, theme detail interactions, official client state capture, and console-error checks passed.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: milestone locations differ from the reference sample because the prototype's confirmed progression values are 4/8/11 rather than 3/7/11.

## Comparison history

1. First visual comparison confirmed the selected structure, colors, density, portrait treatment, and 3/11 state. No P0/P1/P2 fixes were required.

final result: passed
