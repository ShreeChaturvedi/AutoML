# ADR-001: Technology Stack Selection

**Status:** Accepted
**Date:** 2025-09-30
**Decision Makers:** Development Team

## Context

We needed to select a modern, production-ready technology stack for the AI-Augmented AutoML Toolchain frontend. The platform will support complex workflows including data upload, preprocessing, feature engineering, model training, and deployment monitoring.

## Decision

We have chosen the following technology stack:

### Core Framework
- **React 19.1.1**: Latest React with improved performance and concurrent features
- **TypeScript ~5.8.3**: Strict type safety with `verbatimModuleSyntax` enabled
- **Vite 7.1.7**: Fast build tool with HMR (Hot Module Replacement)

### UI & Styling
- **Tailwind CSS v3.4.17**: Utility-first CSS framework (stable, production-ready)
- **shadcn/ui**: Copy-paste component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible component primitives
- **lucide-react**: Icon library with 1000+ icons
- **class-variance-authority (CVA)**: For component variant styling
- **tailwind-merge & clsx**: For conditional class name merging

### State Management
- **Zustand 5.0.8**: Lightweight state management with persistence middleware
  - `projectStore`: Project CRUD and active project selection
  - `tabStore`: Workspace tab management with drag-drop ordering
  - `dataStore`: File upload and data preview state

### Routing
- **React Router v7.9.3**: Declarative routing for React applications

### Data Handling
- **TanStack Table v8**: Powerful, headless table library for large datasets
- **react-dropzone 14.3.8**: File upload with drag-and-drop support
- **PapaParse 5.5.3**: CSV parsing and processing

### Form Management
- **React Hook Form 7.63.0**: Performant form library with minimal re-renders
- **Zod 4.1.11**: TypeScript-first schema validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### Drag & Drop
- **@dnd-kit**: Modern, accessible drag-and-drop toolkit
  - `@dnd-kit/core`: Core drag-and-drop functionality
  - `@dnd-kit/sortable`: Sortable list utilities
  - `@dnd-kit/utilities`: Helper utilities

### Utilities
- **date-fns 4.1.0**: Modern date utility library

## Rationale

### Why React 19?
- Latest version with improved concurrent rendering
- Excellent ecosystem and community support
- Perfect for complex, interactive UIs

### Why Tailwind CSS v3 (not v4)?
- **Stability**: v3.4.17 is battle-tested and production-ready
- **Ecosystem Maturity**: Full compatibility with all tools and plugins
- **No Native Dependencies**: v4 uses lightningcss which has platform-specific native binaries that caused issues
- **Version Lesson**: Always evaluate version maturity vs bleeding-edge features

### Why Zustand over Redux?
- Simpler API with less boilerplate
- Built-in persistence middleware
- Better TypeScript support
- Smaller bundle size (~1KB vs ~10KB)
- Sufficient for our use case (no complex middleware needed)

### Why shadcn/ui?
- **Ownership**: Components are copied into our codebase, not installed as a package
- **Customization**: Full control over component code and styling
- **Consistency**: Built on Radix UI primitives for accessibility
- **Dark Mode**: First-class dark mode support via CSS variables

### Why TanStack Table?
- Headless architecture allows full UI control
- Handles large datasets efficiently with virtualization
- Powerful sorting, filtering, and pagination
- TypeScript-first design

### Why React Hook Form + Zod?
- Minimal re-renders (better performance than Formik)
- Zod provides runtime validation and TypeScript type inference
- Great developer experience with type safety

## Consequences

### Positive
- Modern, performant stack with excellent DX (Developer Experience)
- Strong type safety throughout the application
- Accessible components out of the box (Radix UI)
- Small bundle size with code splitting
- Easy to maintain and extend

### Negative
- Learning curve for developers unfamiliar with Zustand or TanStack Table
- shadcn/ui components need manual updates (not npm-managed)
- React 19 is very new (released early 2025), potential for minor bugs

### Risks
- React 19 adoption by ecosystem (currently mitigated - major libraries support it)
- Tailwind CSS bundle size for large applications (mitigated with PurgeCSS)

## Implementation Notes

- All type-only imports must use `import type` syntax due to `verbatimModuleSyntax`
- Dark mode is the default theme, managed via context and localStorage
- Path aliases configured: `@/` → `src/`
- Node.js 22 LTS required (managed via fnm with `.node-version` file)

## Future Considerations

- Consider migrating to Tailwind v4 once ecosystem stabilizes (6-12 months)
- Evaluate adding React Query for server state management when backend is integrated
- Consider adding Storybook for component documentation