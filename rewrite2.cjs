const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/DashboardTab.tsx', 'utf-8');

// The block to remove:
const blockToRemoveStart = `      {/* 4. PORTFOLIO & RISK ANALYSIS SUB-TAB CONTENT */}`;
const blockToRemoveEnd = `      {/* 2. TRADING SUB-TAB CONTENT */}`;

if (content.indexOf(blockToRemoveStart) !== -1 && content.indexOf(blockToRemoveEnd) !== -1) {
    const startIdx = content.indexOf(blockToRemoveStart);
    const endIdx = content.indexOf(blockToRemoveEnd);
    const blockContent = content.substring(startIdx, endIdx);
    
    // We remove the block completely
    content = content.substring(0, startIdx) + content.substring(endIdx);
    
    // Now extract the components from blockContent
    const extract = (pattern) => {
        const m = blockContent.match(pattern);
        return m ? m[0] : '';
    };

    const drawdownMonitor = extract(/      {\/\* Drawdown Monitor Real-Time Chart \*\/}\n      <DrawdownMonitor[\s\S]*?\/>\n/);
    const portfolioHealth = extract(/      {\/\* Portfolio Health Monitor & Diversification Score \*\/}\n      <PortfolioHealthMonitor[\s\S]*?\/>\n/);
    const posdist = extract(/      {\/\* Percentage Distribution of Open Positions \(Recharts Pie Chart\) \*\/}\n      <PositionDistributionChart[\s\S]*?\/>\n/);
    const pricealerts = extract(/      {\/\* Custom Price Alerts Configuration Panel \*\/}\n      \{setAlerts && \([\s\S]*?\)\}\n/);
    const heatmap = extract(/      {\/\* Market Correlation Heatmap \(Grid Matrix Visualization\) \*\/}\n      <MarketCorrelationHeatmap[\s\S]*?\/>\n/);
    const depth = extract(/      {\/\* Market Depth Level 2 Order Book Spread & Liquidity Depth Chart \*\/}\n      <MarketDepthChart[\s\S]*?\/>\n/);
    const symbolcorr = extract(/      {\/\* Symbol Correlation & Systemic Risk Analysis Panel \*\/}\n      <SymbolCorrelationPanel[\s\S]*?\/>\n/);

    // Insert them in RISK
    const riskTarget = `      {/* Macro Economic Calendar & High-Volatility Auto-Trading Guard */}\n      <EconomicCalendar />\n`;
    const riskInsert = `${riskTarget}\n${drawdownMonitor}\n${portfolioHealth}\n${symbolcorr}\n`;
    content = content.replace(riskTarget, riskInsert);

    // Insert them in TRADING
    const tradingTarget = `      {/* Active Positions List */}`;
    const tradingInsert = `${depth}\n${pricealerts}\n${heatmap}\n\n      {/* Active Positions List */}`;
    content = content.replace(tradingTarget, tradingInsert);

    // Insert them in ANALYTICS
    const analyticsTarget = `      {/* Strategy Validator & ML Feature Toggling Simulation Panel */}\n      <StrategyValidator mlStats={mlStats} />\n`;
    const analyticsInsert = `${analyticsTarget}\n${posdist}\n`;
    content = content.replace(analyticsTarget, analyticsInsert);
    
    fs.writeFileSync('src/components/tabs/DashboardTab.tsx', content);
    console.log("Success");
} else {
    console.log("Could not find blocks");
}

