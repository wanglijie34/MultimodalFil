import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "崇祯模拟器",
  description: "大明末年历史模拟",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        className="font-serif antialiased bg-transparent text-[#e4cfa1]"
        suppressHydrationWarning
      >
        <I18nProvider>
          <AppShell>
            {children}
          </AppShell>
          <ToastContainer />
        </I18nProvider>
      </body>
    </html>
  );
}
