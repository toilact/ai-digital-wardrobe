"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

function isLegacyLocalEmail(email?: string | null) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@adw.local");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
