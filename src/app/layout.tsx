import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kiki Personal OS",
    template: "%s · Kiki Personal OS",
  },
  description: "手机优先的个人 AI 工作台",
  applicationName: "Kiki Personal OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kiki OS",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6f50",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
