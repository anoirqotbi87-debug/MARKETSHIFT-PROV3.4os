const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/DashboardTab.tsx', 'utf-8');

// We will extract the exact components by their JSX tags or comments.

const getComponent = (startRegex, endRegex) => {
  const startMatch = content.match(startRegex);
  if (!startMatch) return '';
  const start = startMatch.index;
  const endMatch = content.substring(start).match(endRegex);
  if (!endMatch) return '';
  const end = start + endMatch.index + endMatch[0].length;
  const comp = content.substring(start, end);
  content = content.substring(0, start) + content.substring(end);
  return comp;
}

const getFullComponent = (name) => {
    return getComponent(new RegExp(`      {\\/\\* .*? \\*\\/}\\n      <${name}[\\s\\S]*?\\/>\\n`), /\n/);
}

// Special extractions
const drawdownMonitor = getComponent(/      {\/\* Drawdown Monitor Real-Time Chart \*\/}\n      <DrawdownMonitor[\s\S]*?\/>\n/, /\n/);
const portfolioHealth = getComponent(/      {\/\* Portfolio Health Monitor & Diversification Score \*\/}\n      <PortfolioHealthMonitor[\s\S]*?\/>\n/, /\n/);
const posDistribution = getComponent(/      {\/\* Percentage Distribution of Open Positions \(Recharts Pie Chart\) \*\/}\n      <PositionDistributionChart[\s\S]*?\/>\n/, /\n/);
const priceAlerts = getComponent(/      {\/\* Custom Price Alerts Configuration Panel \*\/}\n      \{setAlerts && \([\s\S]*?\)\}\n/, /\n/);
const heatmap = getComponent(/      {\/\* Market Correlation Heatmap \(Grid Matrix Visualization\) \*\/}\n      <MarketCorrelationHeatmap[\s\S]*?\/>\n/, /\n/);
const depthChart = getComponent(/      {\/\* Market Depth Level 2 Order Book Spread & Liquidity Depth Chart \*\/}\n      <MarketDepthChart[\s\S]*?\/>\n/, /\n/);
const symbolCorr = getComponent(/      {\/\* Symbol Correlation & Systemic Risk Analysis Panel \*\/}\n      <SymbolCorrelationPanel[\s\S]*?\/>\n/, /\n/);


// Now we have removed those components from the PORTFOLIO_MARKET section. Let's remove the PORTFOLIO_MARKET shell.
content = content.replace(/      {\/\* 4\. PORTFOLIO & RISK ANALYSIS SUB-TAB CONTENT \*\/}\n      \{dashboardSubTab === 'PORTFOLIO_MARKET' && \(\n        <div className="space-y-4 animate-in fade-in">\n        <\/div>\n      \)}\n\n/g, '');


// Now let's inject them into the right places.

// 1. RISK tab: insert drawdownMonitor, portfolioHealth, symbolCorr after EconomicCalendar
content = content.replace(
  /(<EconomicCalendar \/>\n        <\/div>\n      \)}\n)/,
  `$1\n\n${drawdownMonitor}\n${portfolioHealth}\n${symbolCorr}\n`
);
// Fix the closing div
content = content.replace(
  /<EconomicCalendar \/>\n        <\/div>\n      \)}\n\n\n      {\/\* Drawdown Monitor/,
  `<EconomicCalendar />\n\n${drawdownMonitor}\n${portfolioHealth}\n${symbolCorr}\n        </div>\n      )}\n\n      {/* Drawdown Monitor`
); // wait, that regex is tricky. Let's just do a simpler replacement.
