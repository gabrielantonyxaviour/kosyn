import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Record | Kosyn AI",
  description:
    "Securely upload a new health record. Your data is encrypted before leaving your device.",
};

export default function NewRecordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
