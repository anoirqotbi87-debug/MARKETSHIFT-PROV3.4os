const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add imports
const importsToAdd = `import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LoginScreen } from './components/LoginScreen';\n`;

content = content.replace("import { Header } from './components/Header';", importsToAdd + "import { Header } from './components/Header';");

// Add user state inside App
const stateToAdd = `  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

content = content.replace("export default function App() {\n", "export default function App() {\n" + stateToAdd);

// Add rendering
const renderTarget = `return (
    <div className="min-h-screen`;
    
const renderReplacement = `if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen`;
content = content.replace(renderTarget, renderReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx patched");
