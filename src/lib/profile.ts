import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Gender = "male" | "female";

export type UserAccount = {
  username?: string;
  displayName?: string | null;
  email?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  isVIP?: boolean;
  itemQuantity?: number;
  outfitGenerationsToday?: number;
  outfitGenerationDate?: string;
};

export type UserMetrics = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
};

export type UserProfile = UserAccount & UserMetrics;

type UserDoc = UserAccount & Partial<UserMetrics>;

function isValidGender(x: unknown): x is Gender {
  return x === "male" || x === "female";
}

export async function getUserAccount(uid: string) {
  if (!db) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  return snap.data() as UserDoc;
}

export async function getUserProfile(uid: string) {
  const data = await getUserAccount(uid);
  if (!data) return null;

  const ok =
    isValidGender(data.gender) &&
    typeof data.age === "number" &&
    typeof data.heightCm === "number" &&
    typeof data.weightKg === "number" &&
    data.age > 0 &&
    data.heightCm > 0 &&
    data.weightKg > 0;

  return ok ? (data as UserProfile) : null;
}

export async function upsertUserProfile(uid: string, profile: UserProfile) {
  if (!db) return;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const existingData = snap.exists() ? (snap.data() as UserDoc) : null;

  await setDoc(
    ref,
    {
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: existingData?.createdAt ?? serverTimestamp(),
    },
    { merge: true }
  );
}
