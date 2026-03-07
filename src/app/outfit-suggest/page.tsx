"use client";

import WardrobeStylistChat from "@/components/WardrobeStylistChat";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/profile";

export default function OutfitSuggestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);


  useEffect(() => {
    const run = async () => {
      if (!user) return;

    };

    if (!loading && user) run();
  }, [loading, user, router]);
  if (loading) return <div className="p-6 text-white/70">Loading...</div>;
  if (!user) return null;
  return (
    <div className="dashboard-container h-[100svh] overflow-hidden">
      <WardrobeStylistChat mode="page" idUser={user.uid} />
    </div>
  );
}