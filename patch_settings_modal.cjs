const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

if (!code.includes('PushNotificationManager')) {
  code = code.replace(
    /import \{ X, Settings2, Sliders, Shield, Zap, Database, Smartphone \} from 'lucide-react';/,
    "import { X, Settings2, Sliders, Shield, Zap, Database, Smartphone } from 'lucide-react';\nimport { PushNotificationManager } from './PushNotificationManager';"
  );
  
  const connectionTabCode = `
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    Alertes Push (Appareil)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Activez les notifications pour recevoir les alertes critiques (Stop Loss, Drawdown, Déconnexions) directement sur votre écran, même si l'application est en arrière-plan.
                  </p>
                  <PushNotificationManager logs={[]} />
                </div>
  `;
  
  code = code.replace(
    /\{activeTab === 'connection' && \([\s\S]*?<div className="space-y-6">/,
    "{activeTab === 'connection' && (\n            <div className=\"space-y-6\">\n" + connectionTabCode
  );
  
  fs.writeFileSync('src/components/SettingsModal.tsx', code);
}
