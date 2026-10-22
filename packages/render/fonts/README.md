# Fonts

## Font 0

ZPL's font 0 is Zebra's CG Triumvirate Bold Condensed, which can't be redistributed. `font0.ttf` stands in for it:

- **Shapes:** [Archivo](https://github.com/Omnibus-Type/Archivo) Bold at width 66, licensed under the SIL Open Font License (`OFL.txt`). It was chosen by rendering text with 13 open-licensed condensed fonts and comparing dot by dot with Labelary's font 0; it had the highest overlap.
- **Spacing:** `font0-advances.json` holds font 0's advance width for each character at `^A0N,100,100`, measured from Labelary's renders by `scripts/measure-font0-advances.mjs`. Glyphs are stretched to these widths, so text takes up the same space as on a printer. Characters font 0 doesn't have print nothing but advance like a space (29.5), as on Labelary.

`font0.ttf` was made from Archivo's variable font with fontTools:

```bash
fonttools varLib.instancer "Archivo[wdth,wght].ttf" wght=700 wdth=66 -o archivo.ttf
pyftsubset archivo.ttf --unicodes=<the characters in font0-advances.json> --no-hinting \
  --layout-features='' --drop-tables+=GSUB,GPOS,GDEF,STAT --name-IDs='*' --output-file=font0.ttf
```

`scripts/generate-fonts.mjs` embeds it in `src/fonts/font0.ts`.
