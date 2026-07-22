const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  `    if (themeMode === 'high_contrast_pro') {
      document.documentElement.classList.add('theme-high-contrast');
    } else if (themeMode === 'neon_synthwave') {
      document.documentElement.classList.add('theme-neon-synthwave');
    } else if (themeMode === 'arctic_light') {
      document.documentElement.classList.add('theme-arctic-light');
    } else if (themeMode === 'monochrome_terminal') {
      document.documentElement.classList.add('theme-monochrome-terminal');
    }
  }, [themeMode]);`,
  `    if (themeMode === 'high_contrast_pro') {
      document.documentElement.classList.add('theme-high-contrast');
    } else if (themeMode === 'neon_synthwave') {
      document.documentElement.classList.add('theme-neon-synthwave');
    } else if (themeMode === 'arctic_light') {
      document.documentElement.classList.add('theme-arctic-light');
    } else if (themeMode === 'monochrome_terminal') {
      document.documentElement.classList.add('theme-monochrome-terminal');
    }
  }, [themeMode]);`
);
