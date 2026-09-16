import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "九州プロレス グッズ管理",
  description: "グッズ企画・予算・進行管理ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">
        <header className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
            <span className="shrink-0 pt-0.5 text-base font-semibold text-gray-800">
              九州プロレス グッズ管理
            </span>
            <SiteNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
