const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');

const toggleThemeLogicNew = `
  const toggleTheme = () => {
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
`;

header = header.replace(/  const toggleTheme = \(\) => {[\s\S]*?setThemeMode\(themes\[nextIndex\] as ThemeMode\);\n  };/, toggleThemeLogicNew);
header = header.replace(/  const toggleTheme = \(\) => {[\s\S]*?setThemeMode\(themes\[nextIndex\]\);\n  };/, toggleThemeLogicNew);

fs.writeFileSync('src/components/Header.tsx', header);
