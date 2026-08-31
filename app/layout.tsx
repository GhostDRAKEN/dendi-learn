import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import SoundProvider from "./components/SoundProvider";
import ThemeProvider from "./components/ThemeProvider";
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
  title: "Dendi Learn",
  description: "Apprenez le Dendi, langue du nord Bénin",
  icons: {
  icon: "/favicon.svg",
},
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var theme=localStorage.getItem('dendi-theme');document.documentElement.dataset.theme=theme==='dark'?'dark':'light';document.documentElement.style.colorScheme=theme==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SoundProvider>
            {children}
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
            <Footer />
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
