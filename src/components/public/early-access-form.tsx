"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EarlyAccessForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setStatus("loading");
    setMessage("");
    const response = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        company: formData.get("company"),
        email: formData.get("email"),
        monthlyVehicleVolume: formData.get("monthlyVehicleVolume"),
        biggestChallenge: formData.get("biggestChallenge"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.message || "Could not submit the request.");
      return;
    }
    setStatus("success");
    setMessage("Thanks. Your message has been received.");
  }

  return (
    <form action={submit} className="space-y-4">
      <div className={compact ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Dealership / Company</Label>
          <Input id="company" name="company" required placeholder="Dealership name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" required type="email" placeholder="you@dealer.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyVehicleVolume">Monthly vehicle volume</Label>
          <Input id="monthlyVehicleVolume" name="monthlyVehicleVolume" required placeholder="35 vehicles/month" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="biggestChallenge">How can we help?</Label>
        <Textarea
          id="biggestChallenge"
          name="biggestChallenge"
          required
          placeholder="Tell us about your dealership and what you want to improve."
        />
      </div>
      {message && (
        <p className={status === "error" ? "text-sm text-red-300" : "text-sm text-emerald-300"}>
          {message}
        </p>
      )}
      <Button type="submit" disabled={status === "loading"} className="w-full bg-primary hover:bg-red-700">
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Contact MeadeMark Labs
      </Button>
    </form>
  );
}
