import { ViceApp } from "@/components/vice/vice-app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vice Social — Snapmatic Feed",
  description:
    "Share your Vice City moments. Upload, edit with the Unlayer image editor, and post to the Vice Social feed.",
};

export default function SnapPage() {
  return <ViceApp />;
}
