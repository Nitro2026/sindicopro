import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SíndicoPro",
  description: "Sistema completo para síndicos profissionais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-slate-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
