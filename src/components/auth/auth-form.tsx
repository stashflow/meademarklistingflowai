"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { ListingFlowLoader } from "@/components/common/listingflow-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const next = params.get("next") || "/dashboard";

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));
      const confirmPassword = String(formData.get("confirmPassword") || "");
      const fullName = String(formData.get("fullName") || "");

      if (mode === "signup" && password !== confirmPassword) {
        setMessage("Passwords do not match. Please confirm the same password before creating the account.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next === "/dashboard" ? "/onboarding" : next);
          router.refresh();
          return;
        }
        setMessage("Account created. Check your email to confirm your account, then log in to continue onboarding.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="industrial-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(220,38,38,.16),transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <Card className="app-card overflow-hidden border-white/12 bg-[#0F1218]/95">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10">
              <ShieldCheck className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl leading-tight">
              {mode === "signup" ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Create an account for your dealership workspace."
                : "Log in to continue to ListingFlow."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" required placeholder="Your name" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@dealer.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                  />
                </div>
              )}
              {message && (
                <p className="rounded-md border border-white/10 bg-white/[.035] p-3 text-sm text-muted-foreground">
                  {message}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(220,38,38,.35),0_18px_42px_rgba(220,38,38,.22)] hover:bg-red-500"
              >
                {loading ? (
                  <ListingFlowLoader compact label={mode === "signup" ? "Creating account..." : "Signing in..."} className="text-white" />
                ) : (
                  <>
                    {mode === "signup" ? "Create account" : "Log in"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <Link
                href={`${mode === "signup" ? "/login" : "/signup"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="text-white underline"
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </Link>
            </p>
            {mode === "login" && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Forgot your password?{" "}
                <Link href="/forgot-password" className="text-white underline">
                  Reset it
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
