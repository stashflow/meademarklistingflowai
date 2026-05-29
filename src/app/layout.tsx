import type { Metadata } from "next";
import { MotionPreferencesProvider } from "@/components/common/motion-preferences";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListingFlow AI | MeadeMark Labs",
  description:
    "Dealer-ready vehicle listings generated from real vehicle details, dealership style, and staff review.",
  icons: {
    icon: "/brand/lf-favicon.png",
    apple: "/brand/lf-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <MotionPreferencesProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionPreferencesProvider>
      </body>
    </html>
  );
}
