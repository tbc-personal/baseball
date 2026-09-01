# Mockups

Static screen mockups for Short Season, phone frame 390×844.

Live canvas (pan/zoom, PNG/PDF export): https://claude.ai/code/artifact/d6c4bade-3b0a-472b-9e46-27b1751340ad

| File | Screen |
|---|---|
| `Home.dc.html` | Home / continue |
| `Main.dc.html` | At-bat (the core loop) |
| `Between.dc.html` | Between innings |
| `Season.dc.html` | Standings and batting |
| `DirectionScoreboard.dc.html` | Alternate direction B, low-fi |
| `DirectionBroadsheet.dc.html` | Alternate direction C, low-fi |
| `canvas.json` | Canvas layout |

The `.dc.html` files are plain HTML with inline styles. Implementation
tickets T7 and T8 in [../PLAN.md](../PLAN.md) treat them as the layout
spec; the exact values (colors, type sizes, spacing, button heights) are
in the markup.

## Visual system (Scorecard direction)

| Token | Value |
|---|---|
| Paper | `#f4eee0` with a faint 28px ruled-line pattern at 5% ink |
| Ink | `#23292d` |
| Pencil red (accent, your team, primary button) | `#b5402c` |
| Muted ink (labels) | `#6b6f6a` |
| Faint rule | `#cdc4ad` |
| Display type | Oswald 400–600, fallback Arial Narrow |
| Body / stats type | Courier Prime, fallback Courier New |
| Primary button | 60–64px tall, red fill, cream text, 0.14em tracking, uppercase |
| Choice buttons | 60px tall, 2px ink border; the recommended choice is filled ink |
| Tap targets | 44px minimum |
