# Typography System

**Date:** 2025-09-30
**Status:** Active
**Decision Makers:** Development Team

## Overview

The application uses a consistent typography system with two primary font families: sans-serif for UI elements and monospace for code/data. This document defines the font usage guidelines across the application.

## Font Families

### Sans-serif (UI Font)
**Purpose:** Primary UI font for all non-code elements

**CSS Class:** Default (no explicit class needed)

**Font Stack:**
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Usage:**
- All headings (h1-h6)
- Body text
- Button labels
- Form labels
- Navigation items
- Dialog content
- English mode query input

**Characteristics:**
- Clean, professional appearance
- Excellent readability at all sizes
- Consistent across platforms (uses system fonts)
- Good performance (no font downloads)

### Monospace (Code Font)
**Purpose:** Technical content, data, and code

**CSS Class:** `font-mono`

**Font Stack:**
```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
             "Liberation Mono", "Courier New", monospace;
```

**Usage:**
- Data table cells (not headers)
- SQL queries and code snippets
- File sizes
- Row/column counts
- Technical metadata
- Timestamps in ISO format
- SQL mode query input (Monaco Editor)
- Terminal/console output

**Characteristics:**
- Fixed-width characters for alignment
- Clear distinction between similar characters (0 vs O, 1 vs l)
- Professional developer aesthetic
- Enhanced readability for numeric data

## Font Weights

The application uses a limited set of font weights for consistency:

| Weight | Tailwind Class | Value | Usage |
|--------|----------------|-------|-------|
| Normal | (default) | 400 | Body text, data cells |
| Medium | `font-medium` | 500 | Emphasis, table headers |
| Semibold | `font-semibold` | 600 | Section headings, labels |
| Bold | `font-bold` | 700 | Primary headings |

**Guidelines:**
- Use `font-medium` for table headers to distinguish from data
- Use `font-semibold` for section titles and important labels
- Use `font-bold` sparingly, only for primary page headings
- Avoid using `font-light` or `font-extrabold` (not in our palette)

## Font Sizes

Follow Tailwind's type scale for consistency:

| Tailwind Class | Size | Line Height | Usage |
|----------------|------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem | Small labels, hints |
| `text-sm` | 0.875rem (14px) | 1.25rem | Body text, form inputs |
| `text-base` | 1rem (16px) | 1.5rem | Default body |
| `text-lg` | 1.125rem (18px) | 1.75rem | Large body, small headings |
| `text-xl` | 1.25rem (20px) | 1.75rem | Section headings |
| `text-2xl` | 1.5rem (24px) | 2rem | Page headings |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Primary headings |

**Default:** `text-base` (16px) for body text, `text-sm` (14px) for dense interfaces

## Usage Examples

### Data Table
```tsx
// Headers: Sans-serif, medium weight
<TableHead className="font-medium">Column Name</TableHead>

// Cells: Monospace, normal weight
<TableCell className="font-mono text-sm">123.45</TableCell>

// Footer info: Monospace, small size
<div className="text-xs font-mono text-muted-foreground">
  1,234 rows × 56 columns
</div>
```

### Query Panel
```tsx
// SQL mode: Monospace
<Editor
  options={{
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13
  }}
/>

// English mode: Sans-serif
<Textarea className="font-sans" />

// Mode label: Monospace for "SQL"
<Label className="font-mono">SQL</Label>
```

### File Information
```tsx
// File name: Sans-serif
<p className="text-sm font-medium">dataset.csv</p>

// File size: Monospace
<span className="text-xs font-mono text-muted-foreground">2.5 MB</span>

// Upload timestamp: Monospace
<span className="text-xs font-mono text-muted-foreground">
  2025-09-30 14:23:45
</span>
```

## Monaco Editor Configuration

For SQL syntax highlighting, we use Monaco Editor with specific font settings:

```typescript
{
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: 20,
  fontLigatures: false, // Disable ligatures for clarity
  letterSpacing: 0
}
```

**Why 13px for Monaco?**
- Slightly smaller than body text to fit more code on screen
- Still highly readable due to monospace design
- Matches VSCode's default font size
- Balances information density with readability

## Accessibility Considerations

### Font Size Minimums
- Never use fonts smaller than `text-xs` (12px) for interactive elements
- Use `text-xs` only for supplementary information
- Primary content should be at least `text-sm` (14px)

### Contrast Requirements
All text must meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18px+): 3:1 contrast ratio minimum

### Responsive Typography
```css
/* Mobile: Slightly larger base font */
@media (max-width: 768px) {
  body { font-size: 16px; }
}

/* Desktop: Standard base font */
@media (min-width: 769px) {
  body { font-size: 14px; }
}
```

## Line Height Guidelines

| Context | Line Height | Reasoning |
|---------|-------------|-----------|
| Headings | Tight (1.1-1.25) | Compact, impactful |
| Body text | Relaxed (1.5-1.75) | Comfortable reading |
| Code | Snug (1.4-1.5) | Compact, clear alignment |
| Dense UI | Snug (1.25-1.4) | Space efficiency |

## Special Cases

### Code Snippets in Documentation
```tsx
<pre className="font-mono text-sm bg-muted p-4 rounded-md overflow-x-auto">
  SELECT * FROM table
</pre>
```

### Badge Text
```tsx
<Badge className="text-xs font-mono">SQL</Badge>
```

### Custom Instructions (Textarea)
```tsx
<Textarea className="font-mono text-sm leading-relaxed" />
```

## Don'ts

❌ **Don't mix fonts within a single component**
```tsx
// BAD: Mixing sans and mono inappropriately
<div className="font-sans">
  User: <span className="font-mono">john@example.com</span>
</div>
```

❌ **Don't use monospace for prose**
```tsx
// BAD: Long text in monospace is hard to read
<p className="font-mono">
  This is a long paragraph of text explaining...
</p>
```

❌ **Don't use too many font weights**
```tsx
// BAD: Inconsistent weight usage
<h2 className="font-black">Title</h2>
<p className="font-thin">Content</p>
```

## Implementation Checklist

When implementing a new component:

- [ ] Headers use sans-serif with appropriate weight
- [ ] Data/code uses monospace
- [ ] Font size is appropriate for context (at least 12px)
- [ ] Line height provides comfortable reading
- [ ] Contrast meets WCAG AA standards
- [ ] Responsive considerations addressed
- [ ] Consistent with existing patterns

## Future Enhancements

### Variable Fonts (Consideration)
- Evaluate variable fonts for smoother weight transitions
- Maintain performance and file size constraints
- Ensure browser compatibility

### Custom Coding Font (Optional)
- Consider fonts like JetBrains Mono or Fira Code
- Would require font download (performance trade-off)
- Current system fonts are excellent for our use case

## References

- [Tailwind Typography Plugin](https://tailwindcss.com/docs/font-family)
- [System Font Stack](https://systemfontstack.com/)
- [Monaco Editor Font Configuration](https://microsoft.github.io/monaco-editor/)
- [WCAG 2.1 Text Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
