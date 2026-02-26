import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Records | Kosyn AI",
  description:
    "Browse and manage your encrypted health records stored on IPFS.",
};

export default function PatientRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
