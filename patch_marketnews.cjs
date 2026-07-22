const fs = require('fs');
let code = fs.readFileSync('src/components/MarketNews.tsx', 'utf8');

code = code.replace(
  /<div className="pt-2 flex justify-end">/,
  `<div className="pt-2 flex justify-end gap-2">
              {onApplyNewsWeightToML && (
                <button
                  onClick={() => {
                    onApplyNewsWeightToML(selectedArticle.mlWeightMultiplier, selectedArticle.title);
                    setSelectedArticle(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Intégrer au ML
                </button>
              )}`
);

fs.writeFileSync('src/components/MarketNews.tsx', code);
