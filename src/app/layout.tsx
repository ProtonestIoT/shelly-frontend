import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CNC Machine Occupancy Dashboard",
  description: "Live CNC occupancy monitoring from power readings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} concept-a antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
