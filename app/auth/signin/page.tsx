"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { signIn, getProviders } from "next-auth/react";
import type { ClientSafeProvider } from "next-auth/react";
import { Shield, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProvidersMap = Record<string, ClientSafeProvider>;

export default function SignInPage() {
  const [providers, setProviders] = useState<ProvidersMap | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadProviders = async () => {
      try {
        const result = await getProviders();
        if (!mounted) return;
        setProviders(result ?? {});
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void loadProviders();
    return () => {
      mounted = false;
    };
  }, []);

  const oauthProviders = useMemo(() => {
    if (!providers) return [];
    return Object.values(providers).filter((provider) => provider.type !== "email");
  }, [providers]);

  const emailProvider = useMemo(() => {
    if (!providers) return null;
    return Object.values(providers).find((provider) => provider.type === "email") ?? null;
  }, [providers]);

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailProvider || !email.trim()) return;
    await signIn(emailProvider.id, { email, callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono relative overflow-hidden">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Scan lines */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-900/20 border-2 border-cyan-500/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/50">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-cyan-400 tracking-wider mb-2">
              SECURE ACCESS
            </h1>
            <p className="text-cyan-600 text-sm tracking-widest">
              AUTHENTICATION REQUIRED FOR ALERTS
            </p>
          </div>

          <div className="bg-[#0d0d0d]/80 backdrop-blur-sm border border-cyan-900/30 rounded-lg p-8">
            <div className="mb-6">
              <span className="text-[10px] text-amber-300 tracking-wider block mb-2">
                VERIFIED OPERATOR CHECK
              </span>
              <p className="text-gray-400 text-sm">
                Sign in to manage alerting rules and notification preferences.
              </p>
            </div>

            {isLoading && (
              <div className="flex items-center gap-3 text-cyan-400 text-xs tracking-wider">
                <div className="h-4 w-4 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                LOADING AUTH PROVIDERS...
              </div>
            )}

            {!isLoading && (
              <div className="space-y-4">
                {oauthProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3"
                  >
                    <User className="w-4 h-4 mr-2" />
                    SIGN IN WITH {provider.name.toUpperCase()}
                  </Button>
                ))}

                {emailProvider && (
                  <form onSubmit={handleEmailSignIn} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="operator@domain.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="bg-[#0a0a0a] border-cyan-900/50 text-white"
                    />
                    <Button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3"
                      disabled={!email.trim()}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      EMAIL SIGN-IN LINK
                    </Button>
                  </form>
                )}

                {!oauthProviders.length && !emailProvider && (
                  <div className="text-[11px] text-red-400 border border-red-900/40 bg-red-950/20 rounded p-3">
                    No authentication providers are configured.
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-[10px] text-cyan-500 hover:text-cyan-300 tracking-widest"
              >
                RETURN TO SITUATION MONITOR
              </a>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-gray-600 tracking-wider">
            ENCRYPTED CONNECTION • TLS 1.3
          </div>
        </div>
      </div>
    </div>
  );
}
