# AI-Augmented AutoML Toolchain - Frontend

Production-grade React frontend for the AI-Augmented AutoML platform. Built with TypeScript, Tailwind CSS, and modern React patterns.

## 🚀 Quick Start

### Prerequisites
- Node.js 22 LTS (managed via fnm)
- npm (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
The dev server runs at `http://localhost:5173/`

## 🎯 Current State (September 30, 2025)

### ✅ Complete and Working
- **Build System**: TypeScript + Vite with zero compilation errors
- **Styling**: Tailwind CSS v3 with dark/light theme support
- **State Management**: Zustand stores (projects, tabs, data)
- **UI Components**: Full shadcn/ui component library
- **Layout**: AppShell with collapsible sidebar and data explorer
- **Projects**: Create, edit, delete with color/icon customization
- **Tabs**: Drag-drop reorderable workspace tabs
- **File Upload**: Drag-drop upload with CSV preview
- **Data Preview**: TanStack Table with sorting, statistics panel
- **Routing**: React Router with home and project workspace routes

### 🔄 Expected First Load Experience

When you open `http://localhost:5173/`, you'll see:
- **Dark blue-grey background** (dark mode default)
- **Welcome screen** with "AI-Augmented AutoML Toolchain" title
- **"Create Your First Project" button**
- **Collapsible sidebar** (toggle with icon in top bar)
- **Theme toggle** (sun/moon icon) to switch light/dark modes

**Note**: The dark background is intentional. In dark mode, `--background` is set to `HSL(222.2, 84%, 4.9%)` - a very dark blue-grey that's almost black.

## 📁 Project Structure

See [documentation/architecture/folder-structure.md](./documentation/architecture/folder-structure.md) for details.

## 🛠 Tech Stack

- **Framework**: React 19.1.1 + TypeScript 5.8.3
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS v3.4.17
- **UI**: shadcn/ui + Radix UI
- **State**: Zustand 5.0.8
- **Routing**: React Router v7.9.3
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table v8
- **Upload**: react-dropzone + PapaParse
- **Drag & Drop**: @dnd-kit

See [documentation/decisions/ADR-001-tech-stack.md](./documentation/decisions/ADR-001-tech-stack.md) for rationale.

## 📚 Documentation

- **[ADR-001: Tech Stack](./documentation/decisions/ADR-001-tech-stack.md)** - Technology decisions and rationale
- **[Folder Structure](./documentation/architecture/folder-structure.md)** - Code organization
- **[Color System](./documentation/design/color-system.md)** - Theme and color usage

## 🐛 Troubleshooting

### Only seeing a blue background?
1. Open browser console (F12) - check for JavaScript errors
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Verify dev server is running: `npm run dev`
4. Check you're at `http://localhost:5173/`

### Build issues?
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 License

[To be determined]

## 👥 Team

Miami University CSE 448 Capstone - Fall 2025-26
