import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data | Kosyn AI",
  description: "Explore on-chain health data and access logs.",
};

export default function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
