const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  `document.documentElement.classList.remove(
      'theme-high-contrast', 
      'theme-neon-synthwave', 
      'theme-arctic-light', 
      'theme-monochrome-terminal'
    );`,
  `document.documentElement.classList.remove('theme-high-contrast', 'theme-neon-synthwave', 'theme-arctic-light', 'theme-monochrome-terminal');`
);
fs.writeFileSync('src/App.tsx', app);
