"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { ListingFlowLoader } from "@/components/common/listingflow-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const email = String(formData.get("email") || "").trim();
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (error) throw error;
      setMessage("If that email is registered, a secure password reset link has been sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send a reset link.");
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
            <CardTitle className="font-display text-3xl leading-tight">Reset Password</CardTitle>
            <CardDescription>Enter your account email and ListingFlow will send a secure reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@dealer.com" />
              </div>
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
                {loading ? <ListingFlowLoader compact label="Sending reset link" /> : <><MailCheck className="h-4 w-4" /> Send reset link</>}
              </Button>
            </form>
            <Button asChild variant="ghost" className="mt-4 w-full">
              <Link href="/login"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
