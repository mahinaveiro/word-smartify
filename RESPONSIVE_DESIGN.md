# Responsive Design Documentation

This document outlines the responsive design strategy for Word Smartify.

## Breakpoints

Word Smartify uses Tailwind CSS v4 default breakpoints:

- **Mobile**: `< 768px` (default, no prefix)
- **Tablet**: `md:` - `768px+`
- **Desktop**: `lg:` - `1024px+`
- **Large Desktop**: `xl:` - `1280px+`
- **Extra Large**: `2xl:` - `1536px+`

Custom breakpoints:
- **Small mobile**: `min-[480px]:` - `480px+` (for 3-column grid on larger phones)

## Layout Strategy

### Mobile (<768px)
- **Navigation**: Bottom navigation bar with 5 primary items
- **Top Bar**: Sticky header with logo and streak counter
- **Content**: Single column, max-width constraints prevent stretching
- **Spacing**: Smaller padding (`px-4`, `py-3`)

### Tablet (768px - 1023px)
- **Navigation**: Desktop sidebar appears at `md:` (768px)
- **Content**: 
  - Main content area expands to `max-w-4xl` (1024px)
  - Quiz/session views expand from `max-w-lg` to `md:max-w-2xl`
  - Modals expand from `max-w-md` to `md:max-w-lg`
  - Side drawers expand from `max-w-sm` to `md:max-w-md`
- **Spacing**: Increased padding (`md:px-6`, `md:px-8`)
- **Grids**:
  - Dashboard stats: 4 columns (`md:grid-cols-4`)
  - Level grid: 4 columns (`md:grid-cols-4`)
  - Progress charts: 2 columns (`md:grid-cols-2`)

### Desktop (1024px+)
- **Navigation**: Full sidebar (256px width) on the left
- **Content**: Constrained to `max-w-4xl` (1024px) centered
- **Hero Section**: Horizontal layout with progress ring + 3 cards side-by-side
- **Grids**:
  - Level grid: 5 columns at `lg:`, 6 columns at `xl:`
  - Dashboard bottom cards: 2 columns (`lg:grid-cols-2`)

## Max-Width Constraints

### Global
- **App Shell Main Content**: `max-w-4xl` (1024px)
- **Landing Page**: `max-w-5xl` (1280px)

### Focus Routes (No Navigation)
- **Sessions/Challenge/Review**: 
  - Mobile: `max-w-lg` (512px)
  - Tablet: `md:max-w-2xl` (672px)
- **Mock Test Run**: `max-w-2xl` (672px)
- **Mock Test Result**: `max-w-3xl` (768px)

### Components
- **Modal**: 
  - Mobile: `max-w-md` (448px)
  - Tablet: `md:max-w-lg` (512px)
- **Drawer (side)**:
  - Mobile: `max-w-sm` (384px)
  - Tablet: `md:max-w-md` (448px)
- **Toast**: `max-w-sm` (384px)
- **Bottom Nav**: `max-w-lg` (512px) centered

## Safe Area Handling

### iOS Notch / Bottom Bar
- **Top**: `MobileTopBar` uses `paddingTop: max(0.75rem, env(safe-area-inset-top))`
- **Bottom**: 
  - `BottomNav` uses `paddingBottom: env(safe-area-inset-bottom)`
  - Focus routes use `paddingBottom: max(2rem, calc(2rem + env(safe-area-inset-bottom)))`

## Grid Patterns

### Dashboard
```
Hero Section:
- Mobile: stacked (progress ring, then cards vertically)
- 480px+: 3-column card grid (min-[480px]:grid-cols-3)
- 1024px+: horizontal layout (lg:flex-row)

Stats:
- Mobile: 2 columns
- Tablet: 4 columns (md:grid-cols-4)

Bottom Cards:
- Mobile: 1 column
- Desktop: 2 columns (lg:grid-cols-2)
```

### Learn View
```
Level Grid:
- Mobile: 2 columns
- Phone: 3 columns (sm:grid-cols-3)
- Tablet: 4 columns (md:grid-cols-4)
- Desktop: 5 columns (lg:grid-cols-5)
- Large: 6 columns (xl:grid-cols-6)
```

### Mock Test Results
```
Stats:
- Mobile: 2 columns
- Phone: 3 columns (sm:grid-cols-3)
- Tablet: 5 columns (md:grid-cols-5)
```

## Key Responsive Components

### Hero Section (Dashboard)
- **Challenge**: Prevented stacking at 1536px by using `lg:flex-row` instead of `2xl:flex-row`
- **Cards**: Use `lg:min-w-0` to maintain 3-column grid even when in horizontal layout

### Quiz/Learning Views
- Comfortable reading width on tablets (`md:max-w-2xl`)
- Proper bottom padding for devices with home indicators

### Navigation
- Sidebar appears at `md:` (768px) - appropriate for tablet landscape
- Bottom nav hidden at `md:` when sidebar appears
- Mobile top bar hidden at `md:` when sidebar is present

## Touch Targets

All interactive elements maintain minimum 44x44px touch targets on mobile:
- Buttons: `h-11` minimum (44px)
- Icon buttons: `size-8` to `size-12` (32px-48px)
- Bottom nav items: generous padding with icon + label
- Utility class available: `.touch-target` for custom elements

## Testing Checklist

### Mobile (320px - 767px)
- [ ] Bottom navigation doesn't cover content
- [ ] All buttons are reachable with thumb
- [ ] Forms don't overflow or cause horizontal scroll
- [ ] Safe areas respected on iPhone (notch/home indicator)
- [ ] Text remains readable (no tiny fonts)

### Tablet Portrait (768px - 1023px)
- [ ] Sidebar appears and is functional
- [ ] Content doesn't feel cramped
- [ ] Grids use available space well
- [ ] Modals/drawers are appropriately sized

### Tablet Landscape (768px - 1023px)
- [ ] Sidebar + content layout balanced
- [ ] No wasted whitespace
- [ ] Reading comfortable (line length not too long)

### Desktop (1024px+)
- [ ] Content centered with appropriate max-widths
- [ ] Hero section displays horizontally
- [ ] Level grid utilizes width effectively
- [ ] No unnecessary stretching on ultra-wide monitors

## Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
```

- `viewport-fit=cover`: Extends into safe areas (notch, etc.)
- `user-scalable=no`: Prevents accidental zoom (PWA behavior)

## Notes

- **Desktop-first is avoided**: The app is mobile-first, progressively enhanced for larger screens
- **No fake offline mode**: While PWA-installable, the app requires online connection for full functionality
- **Consistent spacing scale**: Uses Tailwind's default spacing scale for predictability
- **Neo-brutalist aesthetic**: Maintained across all breakpoints with brutal shadows and bold borders
