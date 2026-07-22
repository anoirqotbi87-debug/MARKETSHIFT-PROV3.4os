import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const isMockConfig = (firebaseConfig as any).apiKey === 'remixed-api-key';

let app;
export let auth: any = null;
export let googleProvider: any = null;
export let db: any = null;

if (!isMockConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  const databaseId = (firebaseConfig as any).firestoreDatabaseId;
  db = getFirestore(app, databaseId);
}
