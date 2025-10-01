# Color System

## Overview

The application uses a CSS variable-based color system that supports both light and dark themes. Colors are defined in HSL (Hue, Saturation, Lightness) format for easy manipulation.

## Theme Structure

### CSS Variables

All colors are defined as CSS variables in `src/index.css`:

```css
:root {
  /* Light mode colors */
}

.dark {
  /* Dark mode colors */
}
```

### Color Variables

#### Background Colors
- **--background**: Main background color
  - Light: `0 0% 100%` (pure white)
  - Dark: `222.2 84% 4.9%` (very dark blue-grey)

- **--foreground**: Text color on background
  - Light: `222.2 84% 4.9%` (very dark blue-grey)
  - Dark: `210 40% 98%` (off-white)

#### Component Colors
- **--card**: Card background
- **--card-foreground**: Text on cards
- **--popover**: Popover background
- **--popover-foreground**: Text on popovers

#### Interactive Colors
- **--primary**: Primary brand color (blue accent)
  - Light: `221.2 83.2% 53.3%` (medium blue)
  - Dark: `217.2 91.2% 59.8%` (bright blue)

- **--secondary**: Secondary actions
  - Light: `210 40% 96.1%` (light grey-blue)
  - Dark: `217.2 32.6% 17.5%` (dark blue-grey)

- **--muted**: Muted content
  - Light: `210 40% 96.1%`
  - Dark: `217.2 32.6% 17.5%`

- **--accent**: Accent color for highlights
  - Light: `210 40% 96.1%`
  - Dark: `217.2 32.6% 17.5%`

- **--destructive**: Destructive actions (red)
  - Light: `0 84.2% 60.2%`
  - Dark: `0 62.8% 30.6%`

#### Border & Input Colors
- **--border**: Default border color
- **--input**: Input field border
- **--ring**: Focus ring color

#### Border Radius
- **--radius**: Default border radius (`0.5rem`)

## Project-Specific Colors

### Project Icon Colors

Defined in `src/types/project.ts`:

```typescript
type ProjectColor =
  | 'blue' | 'green' | 'purple' | 'pink'
  | 'orange' | 'red' | 'yellow' | 'indigo'
  | 'teal' | 'cyan';
```

Each color has associated Tailwind classes that adapt to light/dark mode:
- `bg`: Background color (solid in light mode, opacity in dark mode)
- `text`: Text/icon color (darker shade in light, lighter in dark)
- `hover`: Hover state background
- `border`: Border color

**Example:**
```typescript
blue: {
  bg: 'bg-blue-100 dark:bg-blue-500/20',
  text: 'text-blue-700 dark:text-blue-400',
  hover: 'hover:bg-blue-200 dark:hover:bg-blue-500/30',
  border: 'border-blue-300 dark:border-blue-500/40'
}
```

**Design Philosophy:**
- Light mode uses solid colors (100-300 shades) for better contrast
- Dark mode uses opacity-based colors for consistency with existing design
- Text colors are adjusted for WCAG AA compliance in both modes

## Theme Management

### Theme Provider

Theme is managed via `ThemeProvider` component in `src/components/theme-provider.tsx`:

```typescript
type Theme = 'dark' | 'light' | 'system';
```

- **dark**: Force dark mode
- **light**: Force light mode
- **system**: Follow OS preference

### Default Theme

The application defaults to **dark mode** for the following reasons:
1. Reduced eye strain for long coding/data science sessions
2. Better contrast for data visualizations
3. Modern, professional aesthetic
4. Aligns with target audience preferences (data scientists, ML engineers)

### Changing Theme

Users can toggle theme via the `ThemeToggle` component (sun/moon icon in top bar).

## Usage Guidelines

### Using Semantic Colors

**✅ DO:**
```typescript
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">
<Card className="border-border">
```

**❌ DON'T:**
```typescript
<div className="bg-white text-black">  // Hardcoded colors won't respect theme
<Button className="bg-blue-500">       // Use semantic colors instead
```

### Creating Custom Components

Use HSL color variables for consistency:

```css
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

### Adding New Colors

1. Add to `src/index.css` under both `:root` and `.dark`
2. Document here
3. Add Tailwind plugin if needed

## Accessibility

### Contrast Ratios

All color combinations meet **WCAG AA** standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Color Blindness

- Do not rely solely on color to convey information
- Use icons, text labels, and patterns in addition to color
- Test with color blindness simulators

## File Type Colors

Different file types use distinct colors for quick identification:

```typescript
csv:   'bg-green-500/10 text-green-500'     // Green for spreadsheets
json:  'bg-blue-500/10 text-blue-500'       // Blue for structured data
excel: 'bg-emerald-500/10 text-emerald-500' // Emerald for Excel
pdf:   'bg-red-500/10 text-red-500'         // Red for documents
image: 'bg-purple-500/10 text-purple-500'   // Purple for images
other: 'bg-gray-500/10 text-gray-500'       // Grey for unknown
```

## Current UI State

### Initial Load

On first load, the UI shows a **dark blue-grey background** (`--background` in dark mode). This is expected behavior.

**What you should see:**
- Dark background (very dark blue-grey, almost black)
- No projects: Welcome screen with "Create Your First Project" button
- With projects: Projects listed in sidebar

**Troubleshooting:**
If you only see a solid color with no content:
1. Check browser console for React errors
2. Verify `http://localhost:5173/` is running
3. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
4. Check that JavaScript is enabled