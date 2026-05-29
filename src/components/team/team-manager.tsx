"use client";

import { useState } from "react";
import { Clipboard, Link2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DealershipMember, JoinRequest } from "@/types/dealership";

export function TeamManager({
  dealershipId,
  members,
  joinRequests,
  canManage,
}: {
  dealershipId: string;
  members: DealershipMember[];
  joinRequests: JoinRequest[];
  canManage: boolean;
}) {
  const [role, setRole] = useState("staff");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createInvite() {
    setLoading(true);
    const response = await fetch("/api/invites/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealershipId, role, expiresInDays: 14 }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.message || "Could not create invite.");
      return;
    }
    setInviteUrl(payload.url);
    setMessage("Invite link created.");
  }

  async function respond(requestId: string, action: "approve" | "reject") {
    const response = await fetch("/api/join-requests/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action, role: "staff" }),
    });
    const payload = await response.json();
    setMessage(response.ok ? `Join request ${action}d.` : payload.message || "Could not review request.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="app-card">
        <CardHeader><CardTitle>Team members</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-4">
              <div>
                <div className="font-medium">{member.profiles?.full_name || member.profiles?.email || member.user_id}</div>
                <div className="text-xs text-muted-foreground">{member.profiles?.email}</div>
              </div>
              <Badge variant="outline" className="border-white/10">{member.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="app-card">
          <CardHeader><CardTitle>Invite user</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Email sending is not configured. Generate invite links and share them manually.
            </p>
            <Select value={role} onValueChange={(value) => value && setRole(value)} disabled={!canManage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={!canManage || loading} onClick={createInvite} className="bg-primary hover:bg-red-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Create invite link
            </Button>
            {inviteUrl && (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                <div className="break-all text-muted-foreground">{inviteUrl}</div>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(inviteUrl)}>
                  <Clipboard className="h-4 w-4" /> Copy link
                </Button>
              </div>
            )}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader><CardTitle>Join requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {joinRequests.map((request) => (
              <div key={request.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="font-medium">{request.profiles?.full_name || request.profiles?.email || "Requester"}</div>
                <p className="mt-1 text-sm text-muted-foreground">{request.message || "No message provided."}</p>
                {canManage && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => respond(request.id, "approve")} className="bg-primary hover:bg-red-700">Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => respond(request.id, "reject")} className="border-white/10 bg-white/5">Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {joinRequests.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
