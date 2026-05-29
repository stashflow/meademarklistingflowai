import { BrandMark } from "@/components/common/brand-mark";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-white/10 px-6 py-4">
        <BrandMark />
      </div>
      <OnboardingFlow />
    </main>
  );
}
