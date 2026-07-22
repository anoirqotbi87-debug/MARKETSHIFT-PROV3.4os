const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/DashboardTab.tsx', 'utf-8');

// 1. Add imports
content = content.replace("import { LiveMLLatencyChart } from '../LiveMLLatencyChart';", "import { LiveMLLatencyChart } from '../LiveMLLatencyChart';\nimport { InfrastructureMonitor } from '../InfrastructureMonitor';");

// 2. Add Server to lucide-react imports
if (!content.includes('Server')) {
  content = content.replace("BarChart2, Brain, Newspaper, PieChart", "BarChart2, Brain, Newspaper, PieChart, Server");
}

// 3. Update dashboardSubTab state
content = content.replace(
  "const [dashboardSubTab, setDashboardSubTab] = useState<'OVERVIEW' | 'TRADING' | 'RISK' | 'ANALYTICS'>('OVERVIEW');",
  "const [dashboardSubTab, setDashboardSubTab] = useState<'OVERVIEW' | 'TRADING' | 'RISK' | 'ANALYTICS' | 'INFRASTRUCTURE'>('OVERVIEW');"
);

// 4. Add the button to navigation bar
const navTarget = `        <button
          onClick={() => setDashboardSubTab('ANALYTICS')}
          className={\`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border \${
            dashboardSubTab === 'ANALYTICS'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }\`}
        >
          <Brain className="w-4 h-4 text-indigo-300" />
          <span>Analytics</span>
        </button>
      </div>`;

const navReplace = `        <button
          onClick={() => setDashboardSubTab('ANALYTICS')}
          className={\`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border \${
            dashboardSubTab === 'ANALYTICS'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }\`}
        >
          <Brain className="w-4 h-4 text-indigo-300" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('INFRASTRUCTURE')}
          className={\`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border \${
            dashboardSubTab === 'INFRASTRUCTURE'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }\`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Infrastructure</span>
        </button>
      </div>`;

content = content.replace(navTarget, navReplace);

// 5. Add INFRASTRUCTURE sub-tab content at the end of sub-tabs
const analyticsSubTabRegex = /      {\/\* 4\. ANALYTICS SUB-TAB CONTENT \*\/}\n      \{dashboardSubTab === 'ANALYTICS' && \([\s\S]*?\n      \)\}\n/;
const match = content.match(analyticsSubTabRegex);

if (match) {
  const infraContent = `
      {/* 5. INFRASTRUCTURE SUB-TAB CONTENT */}
      {dashboardSubTab === 'INFRASTRUCTURE' && (
        <div className="space-y-4 animate-in fade-in">
          <InfrastructureMonitor accountState={accountState} />
        </div>
      )}
`;
  content = content.replace(match[0], match[0] + infraContent);
}

fs.writeFileSync('src/components/tabs/DashboardTab.tsx', content);
console.log("DashboardTab patched successfully.");

