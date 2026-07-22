import re

with open('src/components/tabs/DashboardTab.tsx', 'r') as f:
    text = f.read()

def extract(pattern):
    global text
    m = re.search(pattern, text)
    if not m:
        return ""
    comp = m.group(0)
    text = text[:m.start()] + text[m.end():]
    return comp

# Components to move
drawdown = extract(r'      {/\* Drawdown Monitor Real-Time Chart \*/}\n      <DrawdownMonitor[\s\S]*?/>\n')
portfolio = extract(r'      {/\* Portfolio Health Monitor & Diversification Score \*/}\n      <PortfolioHealthMonitor[\s\S]*?/>\n')
posdist = extract(r'      {/\* Percentage Distribution of Open Positions \(Recharts Pie Chart\) \*/}\n      <PositionDistributionChart[\s\S]*?/>\n')
pricealerts = extract(r'      {/\* Custom Price Alerts Configuration Panel \*/}\n      {setAlerts && \([\s\S]*?\)}\n')
heatmap = extract(r'      {/\* Market Correlation Heatmap \(Grid Matrix Visualization\) \*/}\n      <MarketCorrelationHeatmap[\s\S]*?/>\n')
depth = extract(r'      {/\* Market Depth Level 2 Order Book Spread & Liquidity Depth Chart \*/}\n      <MarketDepthChart[\s\S]*?/>\n')
symbolcorr = extract(r'      {/\* Symbol Correlation & Systemic Risk Analysis Panel \*/}\n      <SymbolCorrelationPanel[\s\S]*?/>\n')

# Remove PORTFOLIO_MARKET wrapper
text = re.sub(
    r"      {/\* 4\. PORTFOLIO & RISK ANALYSIS SUB-TAB CONTENT \*/}\n      {dashboardSubTab === 'PORTFOLIO_MARKET' && \(\n        <div className=\"space-y-4 animate-in fade-in\">\n        </div>\n      \)}\n*",
    "", text
)

# Fix RISK tab: Put drawdown, portfolio before NewsRiskAlertService, and symbolcorr at the end
# Or just put them all at the end of RISK tab
risk_target = r"      {/\* Macro Economic Calendar & High-Volatility Auto-Trading Guard \*/}\n      <EconomicCalendar />\n"
risk_insertion = f"      {{/* Macro Economic Calendar & High-Volatility Auto-Trading Guard */}}\n      <EconomicCalendar />\n\n{drawdown}\n{portfolio}\n{symbolcorr}\n"
text = text.replace(risk_target, risk_insertion)

# Fix TRADING tab: Put depth, pricealerts, posdist, heatmap after Active Positions List
trading_target = r"      {/\* 5\. POSITIONS & CLOSED TRADES HISTORY SUB-TAB CONTENT \*/}\n      {dashboardSubTab === 'POSITIONS_HISTORY' && \(\n        <div className=\"space-y-4 animate-in fade-in\">\n"
# Wait, TRADING tab is named POSITIONS_HISTORY in the code right now, we need to change it
text = text.replace("'POSITIONS_HISTORY'", "'TRADING'")
text = text.replace("5. POSITIONS & CLOSED TRADES HISTORY", "2. TRADING")
text = text.replace("3. RISK SUB-TAB CONTENT", "3. RISK SUB-TAB CONTENT") # already did RISK
text = text.replace("4. ANALYTICS SUB-TAB CONTENT", "4. ANALYTICS SUB-TAB CONTENT")

# Let's insert the extra trading components right after the opening of TRADING tab
trading_insertion = f"      {{/* 2. TRADING SUB-TAB CONTENT */}}\n      {{dashboardSubTab === 'TRADING' && (\n        <div className=\"space-y-4 animate-in fade-in\">\n\n{depth}\n{pricealerts}\n{heatmap}\n"
text = text.replace(
    r"      {/* 2. TRADING SUB-TAB CONTENT */}" + "\n" + r"      {dashboardSubTab === 'TRADING' && (" + "\n" + r"        <div className=\"space-y-4 animate-in fade-in\">" + "\n",
    trading_insertion
)

# And put posdist in ANALYTICS tab
analytics_target = r"      {/\* Strategy Validator & ML Feature Toggling Simulation Panel \*/}\n      <StrategyValidator mlStats={mlStats} />\n"
analytics_insertion = f"      {{/* Strategy Validator & ML Feature Toggling Simulation Panel */}}\n      <StrategyValidator mlStats={{mlStats}} />\n\n{posdist}\n"
text = text.replace(analytics_target, analytics_insertion)

with open('src/components/tabs/DashboardTab.tsx', 'w') as f:
    f.write(text)

print("Rewrite done")
