"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { ReactNode } from "react";

interface StartButtonProps {
  className?: string;
  children: ReactNode;
}

export default function StartButton({ className, children }: StartButtonProps) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/auth/login";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
