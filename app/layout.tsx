import type { Metadata } from "next";
import Link from "next/link";
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
          <div className="mx-auto flex max-w-6xl items-center gap-6">
            <span className="text-base font-semibold text-gray-800">
              九州プロレス グッズ管理
            </span>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/"                   className="text-gray-600 hover:text-gray-900">商品一覧</Link>
              <Link href="/dashboard"          className="text-gray-600 hover:text-gray-900">ダッシュボード</Link>
              <Link href="/goods/suggest"      className="text-gray-600 hover:text-gray-900">AI案出し</Link>
              <Link href="/goods/suggest/history" className="text-gray-600 hover:text-gray-900">提案履歴</Link>
              <Link href="/meeting"            className="text-gray-600 hover:text-gray-900">会議ビュー</Link>
              <Link href="/meeting/history"    className="text-gray-600 hover:text-gray-900">会議履歴</Link>
              <Link href="/events"             className="text-gray-600 hover:text-gray-900">大会管理</Link>
              <Link href="/sales"              className="text-gray-600 hover:text-gray-900">売上実績</Link>
              <Link href="/ec"                 className="text-gray-600 hover:text-gray-900">EC管理</Link>
              <Link href="/suppliers"          className="text-gray-600 hover:text-gray-900">取引先</Link>
              <Link href="/airregi" title="保留中（API仕様確認待ち）" className="text-gray-400 hover:text-gray-600">
                Airレジ <span className="text-xs">⏸</span>
              </Link>
              <Link href="/ops"                className="text-gray-600 hover:text-gray-900">運用チェック</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
