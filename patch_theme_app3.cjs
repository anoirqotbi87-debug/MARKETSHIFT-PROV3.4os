const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const newTheme = `  // Apply theme class to document root for global CSS overrides
  useEffect(() => {
    try {
      localStorage.setItem('marketshift_theme_mode', themeMode);
    } catch {
      // ignore
    }
    
    document.documentElement.classList.remove('theme-high-contrast', 'theme-neon-synthwave', 'theme-arctic-light', 'theme-monochrome-terminal');
    
    // Add current theme class
    if (themeMode === 'high_contrast_pro') {
      document.documentElement.classList.add('theme-high-contrast');
    } else if (themeMode === 'neon_synthwave') {
      document.documentElement.classList.add('theme-neon-synthwave');
    } else if (themeMode === 'arctic_light') {
      document.documentElement.classList.add('theme-arctic-light');
    } else if (themeMode === 'monochrome_terminal') {
      document.documentElement.classList.add('theme-monochrome-terminal');
    }
  }, [themeMode]);`;

app = app.replace(/  \/\/ Apply theme class to document root for global CSS overrides\n  useEffect\(\(\) => \{[\s\S]*?\}, \[themeMode\]\);/, newTheme);
fs.writeFileSync('src/App.tsx', app);
