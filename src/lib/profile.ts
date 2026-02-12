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
  if (!snap.exists()) return null;

  const data = snap.data() as any;

  // Coi là "đã có profile" khi đủ các field bắt buộc
  const ok =
    typeof data.age === "number" &&
    typeof data.heightCm === "number" &&
    typeof data.weightKg === "number" &&
    data.age > 0 &&
    data.heightCm > 0 &&
    data.weightKg > 0;

  return ok ? (data as UserProfile) : null;
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
