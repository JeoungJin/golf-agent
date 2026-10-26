import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "소모임 골프",
  description: "스크린골프·필드 모임 일정과 공지를 한곳에서 확인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] px-4">
          {children}
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
