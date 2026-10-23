import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 既存の設定項目があればここに記述 */

  // Server Actions で受け取るリクエストボディの上限サイズを拡張 (例: 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;