# App icons

`icon.svg` and `icon-maskable.svg` are the sources. The PNGs in `public/`
are rasterised from them and committed, so a normal build needs no image
tooling and no extra dependency.

To regenerate after editing an SVG, rasterise each source at the sizes the
manifest declares (192, 512 from `icon.svg`; 512 from `icon-maskable.svg`;
180 for `apple-touch-icon.png`; 32 for `favicon.png`) with any rasteriser —
`rsvg-convert`, ImageMagick, or a headless browser screenshot.

The maskable variant is deliberately a different drawing, not the same art
at another size: Android crops a maskable icon to a circle of roughly 80%
of the canvas, so its content sits inside that safe zone.
