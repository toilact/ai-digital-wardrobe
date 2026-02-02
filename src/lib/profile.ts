import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserProfile = {
  age: number;
  heightCm: number;
  weightKg: number;
  bustCm?: number;   // vòng 1
  waistCm?: number;  // vòng 2
  hipCm?: number;    // vòng 3
  updatedAt?: any;
  createdAt?: any;
};

export async function getUserProfile(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function upsertUserProfile(uid: string, profile: UserProfile) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  await setDoc(
    ref,
    {
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: snap.exists() ? (snap.data() as any).createdAt : serverTimestamp(),
    },
    { merge: true }
  );
}
