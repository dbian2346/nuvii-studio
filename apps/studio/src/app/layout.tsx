import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter, Nunito } from "next/font/google";
import "@/styles/tokens.css";
import "./globals.css";

const nuviiDisplay = Cinzel({
  subsets: ["latin"],
  variable: "--font-nuvii-display",
  weight: ["400"],
  display: "swap",
});

const nuviiBody = Nunito({
  subsets: ["latin"],
  variable: "--font-nuvii-body",
  weight: ["400", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const displayFallback = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display-fallback",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nuvii Studio",
  description: "An interactive press-on nail design workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${nuviiDisplay.variable} ${nuviiBody.variable} ${inter.variable} ${displayFallback.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
