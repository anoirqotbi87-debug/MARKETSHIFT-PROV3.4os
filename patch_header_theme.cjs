const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Update cycle logic
const toggleThemeLogicOld = `
  const toggleTheme = () => {
    if (!setThemeMode) return;
    const nextTheme = themeMode === 'cyber_dark' ? 'high_contrast_pro' : 'cyber_dark';
    setThemeMode(nextTheme);
  };
`;

const toggleThemeLogicNew = `
  const toggleTheme = () => {
    if (!setThemeMode) return;
    const themes: ThemeMode[] = ['cyber_dark', 'high_contrast_pro', 'neon_synthwave', 'arctic_light', 'monochrome_terminal'];
    const currentIndex = themes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeMode(themes[nextIndex]);
  };
`;

header = header.replace(toggleThemeLogicOld, toggleThemeLogicNew);

// Update button render logic
const buttonRenderOld = `
            {/* Theme Mode Toggler (Cyber Dark vs High-Contrast Pro) */}
            <button
              onClick={toggleTheme}
              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm \${
                themeMode === 'high_contrast_pro'
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300 hover:bg-indigo-900 shadow-indigo-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }\`}
              title={
                themeMode === 'high_contrast_pro'
                  ? 'Mode actuel : High-Contrast Pro (Lisibilité max). Cliquer pour passer en Cyber Dark'
                  : 'Mode actuel : Cyber Dark. Cliquer pour passer en High-Contrast Pro (Lisibilité extrême)'
              }
            >
              {themeMode === 'high_contrast_pro' ? (
                <>
                  <Contrast className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span className="hidden lg:inline">HIGH-CONTRAST PRO</span>
                  <span className="lg:hidden">PRO</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline">CYBER DARK</span>
                  <span className="lg:hidden">DARK</span>
                </>
              )}
            </button>
`;

const buttonRenderNew = `
            {/* Theme Mode Toggler (Cycles through 5 themes) */}
            <button
              onClick={toggleTheme}
              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm \${
                themeMode === 'neon_synthwave'
                  ? 'bg-fuchsia-950/50 border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-900 shadow-fuchsia-500/20'
                  : themeMode === 'arctic_light'
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm'
                  : themeMode === 'monochrome_terminal'
                  ? 'bg-black border-green-800 text-green-400 hover:bg-green-950/20 shadow-green-500/20'
                  : themeMode === 'high_contrast_pro'
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300 hover:bg-indigo-900 shadow-indigo-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }\`}
              title={\`Mode actuel : \${themeMode.toUpperCase()}. Cliquer pour changer de thème.\`}
            >
              {themeMode === 'high_contrast_pro' ? (
                <>
                  <Contrast className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span className="hidden lg:inline">PRO</span>
                </>
              ) : themeMode === 'neon_synthwave' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
                  <span className="hidden lg:inline">NEON</span>
                </>
              ) : themeMode === 'arctic_light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden lg:inline">ARCTIC</span>
                </>
              ) : themeMode === 'monochrome_terminal' ? (
                <>
                  <Cpu className="w-3.5 h-3.5 text-green-400" />
                  <span className="hidden lg:inline">TERMINAL</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline">DARK</span>
                </>
              )}
            </button>
`;

header = header.replace(buttonRenderOld, buttonRenderNew);
fs.writeFileSync('src/components/Header.tsx', header);
console.log("Header.tsx updated");
