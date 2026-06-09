import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: '--font-roboto-mono' });

export const metadata: Metadata = {
  title: "Oblivion | Autonomous Data Deletion Agent",
  description: "Legally binding RTBF (Right-To-Be-Forgotten) data wipe automation powered by Gemini & MongoDB MCP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${robotoMono.variable} font-sans antialiased bg-oblivion-black text-oblivion-text selection:bg-oblivion-neon selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
