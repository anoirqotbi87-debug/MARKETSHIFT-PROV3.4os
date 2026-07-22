const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');

const regex = /  const toggleTheme = \(\) => {[\s\S]*?  const handleToggleConnectionState = \(\) => {/m;

const replacement = `  const toggleTheme = () => {
    if (!setThemeMode) return;
    if (themeMode === 'neon_synthwave') {
      setThemeMode('arctic_light');
    } else if (themeMode === 'arctic_light') {
      setThemeMode('monochrome_terminal');
    } else if (themeMode === 'monochrome_terminal') {
      setThemeMode('high_contrast_pro');
    } else if (themeMode === 'high_contrast_pro') {
      setThemeMode('cyber_dark');
    } else {
      setThemeMode('neon_synthwave');
    }
  };

  const handleToggleConnectionState = () => {`;

header = header.replace(regex, replacement);
fs.writeFileSync('src/components/Header.tsx', header);
