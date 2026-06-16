import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { MotionPreferencesProvider } from "@/components/common/motion-preferences";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-listingflow-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ListingFlow | MeadeMark Labs",
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
      className={`dark h-full antialiased ${geistSans.variable} ${geistMono.variable} ${displayFont.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <MotionPreferencesProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionPreferencesProvider>
      </body>
    </html>
  );
}
