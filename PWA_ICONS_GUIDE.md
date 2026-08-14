# PWA Icon Generation Guide

This guide explains how to generate the required PWA icons for Word Smartify.

## Required Icons

Based on the updated manifest, you need to generate the following PNG files from `public/icon.svg`:

### Standard Icons (with transparent background or themed background)
- `icon-192.png` - 192×192px
- `icon-512.png` - 512×512px

### Maskable Icons (with safe zone padding)
- `icon-maskable-192.png` - 192×192px
- `icon-maskable-512.png` - 512×512px

### Existing
- `icon.svg` - Already exists ✓
- `apple-icon.png` - 180×180px - Already exists ✓

## Icon Requirements

### Standard Icons
- Use the brand colors: mint (#14b8a6) background with black (#1a1a1a) details
- Can extend to edges of canvas
- Should be recognizable at small sizes

### Maskable Icons
- Follow the [Maskable Icon spec](https://web.dev/maskable-icon/)
- Keep all important content within the **safe zone** (center 80% of canvas)
- Add 10% padding on all sides minimum
- Background should be solid color (use #14b8a6 mint or #f4f1e9 cream)
- The icon will be cropped into various shapes (circle, rounded square, etc.)

## Generation Methods

### Option 1: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then generate standard icons:
magick convert -background none -resize 192x192 public/icon.svg public/icon-192.png
magick convert -background none -resize 512x512 public/icon.svg public/icon-512.png

# For maskable icons, you'll need to add padding first
# (More complex - see Option 2)
```

### Option 2: Using Online Tools
1. Go to [https://realfavicongenerator.net/](https://realfavicongenerator.net/)
2. Upload `public/icon.svg`
3. Configure for Android Chrome
4. Generate and download the icons
5. Rename them according to the list above

### Option 3: Using Figma/Design Tool
1. Open `public/icon.svg` in Figma or your preferred design tool
2. For standard icons:
   - Export at 192×192px as `icon-192.png`
   - Export at 512×512px as `icon-512.png`
3. For maskable icons:
   - Create a 192×192px canvas with #14b8a6 background
   - Center the icon with 20px padding on all sides (safe zone)
   - Export as `icon-maskable-192.png`
   - Repeat for 512×512px → `icon-maskable-512.png`

## Verification

After generating icons, verify them:

1. Check file sizes are reasonable (192px: <50KB, 512px: <100KB)
2. Test maskable icons at [https://maskable.app/editor](https://maskable.app/editor)
3. Verify in Chrome DevTools → Application → Manifest

## Screenshots (Optional but Recommended)

For app store listings, create screenshots:
- `screenshot-mobile.png` - 390×844px (or actual mobile viewport)
- `screenshot-desktop.png` - 1280×800px (or actual desktop viewport)

Take real screenshots of:
- Dashboard view
- Learning session
- Quiz interface

## Favicon Files

Consider also generating traditional favicons:
- `favicon.ico` (multi-size: 16, 32, 48px)
- `favicon-16x16.png`
- `favicon-32x32.png`

## Notes

- All icon files should be placed in the `public/` directory
- PNG files should use optimized compression
- Keep the visual style consistent with the neo-brutalist design
- Test on actual devices after deployment
