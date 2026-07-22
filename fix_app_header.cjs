const fs = require('fs');

let header = fs.readFileSync('src/components/Header.tsx', 'utf-8');
if (!header.includes("import { signOut")) {
    header = header.replace("import React, { useState", "import { signOut } from 'firebase/auth';\nimport { auth } from '../firebase';\nimport React, { useState");
}
if (!header.includes("LogOut")) {
    header = header.replace("Activity", "LogOut, Activity");
}
fs.writeFileSync('src/components/Header.tsx', header);

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// We need to move the auth hooks after the riskConfig state declaration.
// Let's remove them from the top and put them before return.
const authHooks = `
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load data from Firestore
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.riskConfig) setRiskConfig(data.riskConfig);
        }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Save risk config to firestore when it changes
  useEffect(() => {
    if (user && !authLoading) {
      setDoc(doc(db, 'users', user.uid), { riskConfig }, { merge: true }).catch(console.error);
    }
  }, [riskConfig, user, authLoading]);
`;

app = app.replace(authHooks, ""); // remove it from current location

const returnTarget = `  return (
    <div className="min-h-screen`;
app = app.replace(returnTarget, authHooks + "\n" + returnTarget);
fs.writeFileSync('src/App.tsx', app);

console.log("Fixed");
