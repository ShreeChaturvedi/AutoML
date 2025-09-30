/**
 * Project type definitions for the AI-Augmented AutoML Toolchain
 *
 * Projects are the top-level organizational unit containing:
 * - Chats with LLM
 * - Data files (CSVs, JSON, etc.)
 * - Experiments and models
 * - Training jobs
 */

export interface Project {
  id: string;
  title: string;
  description?: string;
  icon: string; // lucide-react icon name
  color: ProjectColor; // Predefined color for icon background
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>; // Extensible metadata
}

/**
 * Predefined color palette for project icons
 * Using Tailwind color classes for consistency
 */
export type ProjectColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'indigo'
  | 'teal'
  | 'cyan';

/**
 * Form data for creating/editing projects
 */
export interface ProjectFormData {
  title: string;
  description?: string;
  icon: string;
  color: ProjectColor;
}

/**
 * Project color mapping to Tailwind classes
 * Used for consistent styling across light/dark modes
 * Higher opacity for better visibility in both themes
 */
export const projectColorClasses: Record<ProjectColor, {
  bg: string;
  text: string;
  hover: string;
  border: string;
}> = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    hover: 'hover:bg-blue-500/30',
    border: 'border-blue-500/40'
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-500',
    hover: 'hover:bg-green-500/30',
    border: 'border-green-500/40'
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-500',
    hover: 'hover:bg-purple-500/30',
    border: 'border-purple-500/40'
  },
  pink: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-500',
    hover: 'hover:bg-pink-500/30',
    border: 'border-pink-500/40'
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-500',
    hover: 'hover:bg-orange-500/30',
    border: 'border-orange-500/40'
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-500',
    hover: 'hover:bg-red-500/30',
    border: 'border-red-500/40'
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    hover: 'hover:bg-yellow-500/30',
    border: 'border-yellow-500/40'
  },
  indigo: {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-500',
    hover: 'hover:bg-indigo-500/30',
    border: 'border-indigo-500/40'
  },
  teal: {
    bg: 'bg-teal-500/20',
    text: 'text-teal-500',
    hover: 'hover:bg-teal-500/30',
    border: 'border-teal-500/40'
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-500',
    hover: 'hover:bg-cyan-500/30',
    border: 'border-cyan-500/40'
  }
};