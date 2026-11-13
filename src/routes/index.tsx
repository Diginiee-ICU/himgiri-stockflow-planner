import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "HIMGIRI Warehouse — Stock & Operations" },
      { name: "description", content: "Manage HIMGIRI warehouse stock and operations." },
      { property: "og:title", content: "HIMGIRI Warehouse — Stock & Operations" },
      { property: "og:description", content: "Manage HIMGIRI warehouse stock and operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
