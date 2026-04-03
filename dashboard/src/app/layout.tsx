import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fulmen Empire Dashboard",
  description: "Admin dashboard for Fulmen Empire digital store",
};

const themeInitScript = `
(function(){try{var d=document.documentElement;var s=localStorage.getItem('theme');var t=s==='light'||s==='dark'||s==='system'?s:'dark';var r=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light':t;d.classList.remove('light','dark');d.classList.add(r);d.style.colorScheme=r;}catch(e){}})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
