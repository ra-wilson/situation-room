"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const handleClick = () => {
    if (isAuthenticated) {
      void signOut();
    } else {
      void signIn();
    }
  };

  // TODO: Use session.user to personalize alerts/saved views.
  const label = isAuthenticated
    ? `Sign out${session?.user?.email ? ` (${session.user.email})` : ""}`
    : "Sign in";

  return (
    <Button onClick={handleClick} variant="outline" size="sm">
      {label}
    </Button>
  );
}
