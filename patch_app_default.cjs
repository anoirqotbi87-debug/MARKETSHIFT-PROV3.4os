const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[themeMode, setThemeMode\] = useState<ThemeMode>\(\(\) => \{[\s\S]*?return 'cyber_dark';\n  \}\);/;
const replace = `const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('marketshift_theme_mode');
      if (saved && ['high_contrast_pro', 'cyber_dark', 'neon_synthwave', 'arctic_light', 'monochrome_terminal'].includes(saved)) {
        return saved as ThemeMode;
      }
    } catch {
      // fallback if localStorage disabled
    }
    return 'neon_synthwave';
  });`;

app = app.replace(regex, replace);
fs.writeFileSync('src/App.tsx', app);
console.log("App default theme updated");
