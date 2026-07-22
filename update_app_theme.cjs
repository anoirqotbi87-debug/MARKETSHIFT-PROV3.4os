const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const targetThemeLogic = `
  // Apply theme class to document root for global CSS overrides
  useEffect(() => {
    try {
      localStorage.setItem('marketshift_theme_mode', themeMode);
    } catch {
      // ignore
    }
    if (themeMode === 'high_contrast_pro') {
      document.documentElement.classList.add('theme-high-contrast');
    } else {
      document.documentElement.classList.remove('theme-high-contrast');
    }
  }, [themeMode]);
`;

const replaceThemeLogic = `
  // Apply theme class to document root for global CSS overrides
  useEffect(() => {
    try {
      localStorage.setItem('marketshift_theme_mode', themeMode);
    } catch {
      // ignore
    }
    // Remove all theme classes first
    document.documentElement.classList.remove(
      'theme-high-contrast', 
      'theme-neon-synthwave', 
      'theme-arctic-light', 
      'theme-monochrome-terminal'
    );
    
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
  }, [themeMode]);
`;

if (app.includes('document.documentElement.classList.remove(\'theme-high-contrast\')')) {
  app = app.replace(targetThemeLogic, replaceThemeLogic);
} else {
  // Try another approach
  app = app.replace(/if \(themeMode === 'high_contrast_pro'\) {[\s\S]*?}, \[themeMode\]\);/, `// Remove all theme classes first
    document.documentElement.classList.remove(
      'theme-high-contrast', 
      'theme-neon-synthwave', 
      'theme-arctic-light', 
      'theme-monochrome-terminal'
    );
    
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
  }, [themeMode]);`);
}

// Change the fallback value in useState if it's there
app = app.replace(
  `if (saved === 'high_contrast_pro' || saved === 'cyber_dark') {`,
  `if (['high_contrast_pro', 'cyber_dark', 'neon_synthwave', 'arctic_light', 'monochrome_terminal'].includes(saved)) {`
);

fs.writeFileSync('src/App.tsx', app);
console.log("App.tsx updated");
