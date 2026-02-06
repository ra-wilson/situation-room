import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/src/components/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Geopolitics Situation Room",
  description: "A geopolitical intelligence dashboard that ingests live news feeds, clusters related stories into events, enriches them with geographic context, and generates structured summaries using AI.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Geopolitics Situation Room",
    description: "A geopolitical intelligence dashboard that ingests live news feeds, clusters related stories into events, enriches them with geographic context, and generates structured summaries using AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
