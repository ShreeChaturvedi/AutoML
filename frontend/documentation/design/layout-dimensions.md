# Layout Dimensions

## Overview

This document defines the dimensions and spacing for major layout components in the application. These values are chosen to balance content readability, screen real estate, and visual hierarchy.

## Sidebar

### Width

**Current Value:** `288px` (Tailwind: `w-72`)

**Rationale:**

The sidebar width was increased from the initial 256px (w-64) to 288px (w-72) to accommodate:

1. **Content Requirements:**
   - Project icon: 28px (7 * 4px)
   - Expand/collapse chevron: 12px
   - Spacing gaps: ~16px total
   - Project name: ~180px usable space
   - More options button: 24px
   - Left/right padding: 16px (8px * 2)

2. **User Experience:**
   - Allows project names of 25-30 characters to display without truncation
   - Provides comfortable spacing between elements
   - Workflow section labels (subitems) have adequate room even with left margin

3. **Screen Real Estate Balance:**
   - On a 1920px wide screen: sidebar takes ~14.5% of width
   - On a 1440px wide screen: sidebar takes ~19.4% of width
   - Still leaves ample space for main content and data explorer panel

**Overflow Behavior:**

When project names exceed available space:
- Project names use `truncate` with `title` attribute for tooltip
- Workflow sections also truncate with proper `min-w-0` constraints
- Icons and buttons use `flex-shrink-0` to prevent compression

### Collapsed State

**Width:** `0px` (w-0)

The sidebar fully collapses with a smooth transition (duration-300) when toggled.

### Height

**Value:** `100vh` (full viewport height)

The sidebar spans the full height of the viewport, with internal sections:
- **Header:** 56px (h-14) - Logo and branding
- **Projects:** flex-1 (scrollable if content overflows)
- **User Profile:** auto height - Fixed at bottom

## Top Bar

### Height

**Value:** `56px` (h-14)

Contains:
- Sidebar toggle button (32px)
- Breadcrumb navigation
- Theme toggle and other controls

Consistent with sidebar header for visual alignment.

## Tab Bar

### Tab Height

**Value:** `40px` (h-10)

**Rationale:**
- Comfortable click target (meets accessibility guidelines)
- Balances horizontal space with vertical content area
- Matches common tab height conventions (VS Code: 35px, Chrome: 34px)

### Tab Width

**Behavior:** Auto (content-determined)

Tabs expand to fit their content (icon + label + close button) with:
- Horizontal padding: 16px (px-4)
- Minimum content: ~120px typical
- Maximum content: No hard limit, but labels should be concise

## Panel Widths

### Data Explorer (Right Panel)

**Default Width:** TBD (currently in development)

**Collapsed Width:** 0px

## Breakpoints

### Responsive Behavior

- **Desktop (≥1024px):** All panels visible, sidebar at full width
- **Tablet (768px-1023px):** Sidebar auto-collapses but can be toggled
- **Mobile (<768px):** Full-screen content, sidebar as overlay

**Note:** Specific breakpoint implementations are defined in Tailwind config and individual components.

## Future Considerations

### Resizable Panels

If user-resizable panels are added in the future:
- Sidebar: Allow 240px (w-60) to 320px (w-80) range
- Data Explorer: Allow 300px to 600px range
- Store user preferences in localStorage

### Accessibility

All interactive elements meet WCAG 2.1 Level AA requirements:
- Minimum touch target: 44x44px (mobile)
- Minimum click target: 24x24px (desktop)
- Clear focus indicators with sufficient contrast

## Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-09-30 | Sidebar width: 256px → 288px | Fix overflow issues with long project names and improve readability |
| 2025-09-30 | Initial documentation created | Establish baseline for layout decisions |