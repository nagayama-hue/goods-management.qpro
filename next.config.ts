import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── デプロイ環境: Railway（永続ファイルシステムあり） ───────────────
  // data/*.json を fs で読み書きしているため、
  // Railway の Persistent Volume をマウントすることでデータが保持される。
  // Railway が PORT 環境変数を注入するため、起動コマンドの変更不要。
};

export default nextConfig;
