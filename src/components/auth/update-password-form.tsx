"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { ListingFlowLoader } from "@/components/common/listingflow-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. Redirecting to your dashboard.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update password.");
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
            <CardTitle className="font-display text-3xl leading-tight">Create New Password</CardTitle>
            <CardDescription>Choose a new secure password for your ListingFlow account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
              </div>
              {message && (
                <p className="rounded-md border border-white/10 bg-white/[.035] p-3 text-sm text-muted-foreground">
                  {message}
                </p>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-red-500">
                {loading ? <ListingFlowLoader compact label="Updating password" /> : <><LockKeyhole className="h-4 w-4" /> Update password</>}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already updated? <Link href="/login" className="text-white underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
