const fs = require('fs');

let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// add imports
content = content.replace("import { Activity", "import { LogOut, Activity");
content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { signOut } from 'firebase/auth';\nimport { auth } from '../firebase';");

// add button next to Paper/Real toggle
const target = `            {/* Paper / Real Toggle */}`;
const replace = `            {/* Auth Logout */}
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-all shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">SIGN OUT</span>
            </button>
            
            {/* Paper / Real Toggle */}`;

content = content.replace(target, replace);
fs.writeFileSync('src/components/Header.tsx', content);
console.log("Header patched");
