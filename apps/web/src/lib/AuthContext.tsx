"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth } from "./firebase";
import { getUserAccount, getUserProfile, UserAccount, UserProfile } from "./profile";

type AuthState = {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  account: UserAccount | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  profile: null,
  account: null,
  refreshProfile: async () => {},
});

function isLegacyLocalEmail(email?: string | null) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@adw.local");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);

  const fetchProfileAndAccount = useCallback(async (uid: string) => {
    try {
      const [p, a] = await Promise.all([
        getUserProfile(uid),
        getUserAccount(uid),
      ]);
      setProfile(p);
      setAccount(a);
    } catch (e) {
      console.error("Failed to fetch profile/account in AuthContext:", e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfileAndAccount(user.uid);
    }
  }, [user, fetchProfileAndAccount]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfileAndAccount(u.uid);
      } else {
        setProfile(null);
        setAccount(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchProfileAndAccount]);

  useEffect(() => {
    if (!user || !auth || !isLegacyLocalEmail(user.email)) {
      return;
    }

    let active = true;

    const syncLegacyEmail = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/sync-email", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!res.ok) {
          return;
        }

        await user.reload();
        if (active) {
          setUser(auth?.currentUser || null);
        }
      } catch (err) {
        console.error("Sync legacy auth email failed:", err);
      }
    };

    void syncLegacyEmail();

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, account, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
