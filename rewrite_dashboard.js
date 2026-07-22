const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/DashboardTab.tsx', 'utf-8');

// Find the parts.
const beforeTabs = content.split('      {/* 1. OVERVIEW SUB-TAB CONTENT */}')[0];
const afterTabs = content.split('      {/* 5. POSITIONS & CLOSED TRADES HISTORY SUB-TAB CONTENT */}')[1];
const endOfHistory = afterTabs.split('      </div>\n      </div>\n      )}\n\n    </div>\n  );\n};')[1]; // Wait, split by the end of POSITIONS_HISTORY?
