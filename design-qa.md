# Compact Theme Chick Progress Design QA

- Source visual truth: `C:/Users/SOYOON~1/AppData/Local/Temp/codex-clipboard-b84bb79a-13f9-4f29-801e-27738db7bbc4.png`
- Browser-rendered implementation: `output/theme-chick-purchase-counts/02b-two-chicks-at-8-purchases.png`
- Combined comparison evidence: `output/theme-chick-compact/reference-vs-implementation.png`
- Viewport: 480 × 1000 CSS px, device scale factor 1
- Source dimensions: 304 × 61 px
- Implementation dimensions: 480 × 1000 px; focused progress region 410 × 53 px normalized to 480 × 54 px
- Comparison dimensions: 480 × 130 px
- State: Wood theme, 8 of 11 parts owned; first two chicks unlocked and third chick locked

## Full-view comparison evidence

- The full implementation keeps the restaurant visible above the half-height theme sheet.
- The previous three-card chick row is gone, leaving the selected theme header, compact progress strip, and theme-part grid.
- The progress strip does not obscure part cards or persistent bottom navigation.

## Focused comparison evidence

- The source and implementation are combined in one image at `output/theme-chick-compact/reference-vs-implementation.png`.
- Both use a single horizontal track, three milestone ticks, colored unlocked chick icons, and a gray locked chick icon.
- The implementation intentionally retains the prototype's cream/brown palette and actual guest sprites instead of copying the reference's unrelated character art.

## Required fidelity surfaces

- Typography: no visible milestone labels were introduced; the component remains icon-first and compact.
- Spacing and layout rhythm: the strip occupies about 42 px between header and part grid, with evenly readable milestone spacing.
- Colors and tokens: unlocked sprites keep their native colors; locked sprites use grayscale, reduced saturation, and lower opacity.
- Image quality and asset fidelity: all three icons use existing project guest assets and rendered with valid natural dimensions.
- Copy and content: visible names and condition sentences were removed; exact names and requirements remain in title and accessibility labels.

## Interaction and regression checks

- 0 owned parts: all three Wood-theme chick icons gray.
- 4 owned parts: first icon colored.
- 8 owned parts: first two icons colored.
- 11 owned parts: all three icons colored.
- Theme progress data remains 4/8/11 for regular themes and 0/8/11 for Stone.
- Half-sheet size, individual installation separation, theme/codex information separation, and browser console checks passed.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: source uses a darker track border, while the implementation uses the game's existing softer theme-panel token. This is intentional system consistency.

## Comparison history

1. Initial implementation used the same compact layout but QA evidence showed a Stone-theme 1/11 state, which did not match the source's two-colored/one-gray state.
2. Captured the Wood-theme 8/11 state and recomposed the comparison. The milestone color states now match the source.

final result: passed
