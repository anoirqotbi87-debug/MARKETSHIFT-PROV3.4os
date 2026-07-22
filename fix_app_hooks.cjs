const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

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

  // Save risk config to firestore when it changes (debounce could be added, but simplistic for now)
  useEffect(() => {
    if (user && !authLoading) {
      setDoc(doc(db, 'users', user.uid), { riskConfig }, { merge: true }).catch(console.error);
    }
  }, [riskConfig, user, authLoading]);
`;

const stateDeclaration = `  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);`;

app = app.replace(authHooks, "");

// put authHooks before "  // Periodic heartbeat simulation"
app = app.replace("  // Periodic heartbeat simulation", authHooks + "\n  // Periodic heartbeat simulation");

fs.writeFileSync('src/App.tsx', app);
