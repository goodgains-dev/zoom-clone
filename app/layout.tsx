import { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter as FontSans } from "next/font/google";
import { SettingsProvider } from '@/components/SettingsProvider'; 
import { Toaster } from "@/components/ui/toaster";
import Provider from "./Provider";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import './globals.css';


// Load fonts
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GoodGains Work",
  description: "Social Productivity App",
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: "dark",
        layout: {
          socialButtonsVariant: "iconButton",
          logoImageUrl: "/icons/yoom-logo.svg",
        },
        variables: { 
          colorPrimary: "#3371FF",
          colorText: "#fff",
          colorBackground: "#1C1F2E",
          colorInputBackground: "#252A41",
          colorInputText: "#fff",
          fontSize: "16px",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`min-h-screen font-sans antialiased ${fontSans.variable} bg-dark-2`}
        >
          <SettingsProvider>
            <Provider>
              <Toaster />
              {children}
            </Provider>
          </SettingsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
