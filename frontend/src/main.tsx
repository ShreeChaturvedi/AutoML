import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="dark" storageKey="automl-ui-theme">
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </ThemeProvider>,
)
