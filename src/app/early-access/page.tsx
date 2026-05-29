import { BrandMark } from "@/components/common/brand-mark";
import { EarlyAccessForm } from "@/components/public/early-access-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EarlyAccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <BrandMark />
      <Card className="app-card mt-10">
        <CardHeader>
          <CardTitle>Early access</CardTitle>
        </CardHeader>
        <CardContent>
          <EarlyAccessForm />
        </CardContent>
      </Card>
    </main>
  );
}
