import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kiki Personal OS",
    short_name: "Kiki OS",
    description: "手机优先的个人 AI 工作台",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#1f6f50",
    orientation: "portrait-primary",
    lang: "zh-CN",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
