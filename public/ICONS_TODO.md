# PWA Icons - Generation Required

## Status: Pending Icon Generation

The PWA manifest has been updated to reference the following icon files that need to be generated:

### Missing Icons (need to be created from icon.svg):
- [ ] `icon-192.png` - 192×192px standard icon
- [ ] `icon-512.png` - 512×512px standard icon  
- [ ] `icon-maskable-192.png` - 192×192px maskable icon (with safe zone padding)
- [ ] `icon-maskable-512.png` - 512×512px maskable icon (with safe zone padding)

### Optional (for app store listings):
- [ ] `screenshot-mobile.png` - Mobile screenshot (390×844px suggested)
- [ ] `screenshot-desktop.png` - Desktop screenshot (1280×800px suggested)

### Existing Icons ✓
- `icon.svg` - SVG source icon
- `apple-icon.png` - 180×180px Apple touch icon
- `icon-dark-32x32.png` - 32×32 dark theme favicon
- `icon-light-32x32.png` - 32×32 light theme favicon

## How to Generate

See `../PWA_ICONS_GUIDE.md` for detailed instructions on generating these icons.

## Quick Start

If you have ImageMagick installed:
```bash
cd public
magick convert -background none -resize 192x192 icon.svg icon-192.png
magick convert -background none -resize 512x512 icon.svg icon-512.png
```

For maskable icons, use a design tool to add proper safe-zone padding.

## Why This Matters

Without these icons:
- PWA install prompts may not appear on Android
- App icon may look incorrect on various devices
- App store listings won't have proper branding

The manifest is configured, but the actual PNG files must be created before deployment.
