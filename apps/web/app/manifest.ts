import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SRU-Meeting",
    short_name: "SRU-Meeting",
    description: "Self-hosted video conference",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#00bceb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
