const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');

if (!header.includes('SettingsModal')) {
  // Add Settings2 to lucide-react imports
  header = header.replace(/ChevronDown \} from 'lucide-react';/, "ChevronDown, Settings2 } from 'lucide-react';");
  
  // Add SettingsModal import
  header = header.replace(/import \{ BiometricAuthModal \}/, "import { SettingsModal } from './SettingsModal';\nimport { BiometricAuthModal }");
  
  // Add isSettingsOpen state
  header = header.replace(/const \[isBioModalOpen, setIsBioModalOpen\] = useState<boolean>\(false\);/, "const [isBioModalOpen, setIsBioModalOpen] = useState<boolean>(false);\n  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);");
  
  // Add settings button next to theme toggler
  header = header.replace(
    /<\/div>\n\n            \{\/\* Emergency Circuit Breaker Kill Switch \/ Reset Button \*\/\}/,
    `</div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
              title="Paramètres de l'application"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Emergency Circuit Breaker Kill Switch / Reset Button */}`
  );
  
  // Add SettingsModal component before BiometricAuthModal
  header = header.replace(
    /<BiometricAuthModal/,
    `{riskConfig && setRiskConfig && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          riskConfig={riskConfig}
          setRiskConfig={setRiskConfig as any}
        />
      )}
      <BiometricAuthModal`
  );

  fs.writeFileSync('src/components/Header.tsx', header);
  console.log('Header patched with settings');
}
