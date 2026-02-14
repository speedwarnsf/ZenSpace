import { useTheme } from './ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'system':
        return 'System theme';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-white/50 dark:bg-stone-800/50 
                 hover:bg-white/80 dark:hover:bg-stone-800/80
                 text-stone-600 dark:text-stone-400
                 hover:text-stone-900 dark:hover:text-stone-100
                 transition-all duration-200
                 border border-stone-200/50 dark:border-stone-700/50
                 backdrop-blur-sm
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      aria-label={`Current: ${getLabel()}. Click to change.`}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}
