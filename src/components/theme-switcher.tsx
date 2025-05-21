import { MoonIcon, SunIcon } from 'lucide-react';
import { useState } from 'react';

type Theme = 'light' | 'dark';

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.getAttribute("data-theme") as Theme || "light"
  });


  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  };

  return (
    <button 
      onClick={toggleTheme}
      className="btn btn-circle rounded-full bg-white/10 backdrop-blur-sm shadow-sm hover:bg-white/20 transition-all duration-300"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </button>
  );
};
