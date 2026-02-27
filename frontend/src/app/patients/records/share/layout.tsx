import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Share Record | Kosyn AI",
  description:
    "Grant a verified provider access to your health record with on-chain consent.",
};

export default function ShareRecordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
