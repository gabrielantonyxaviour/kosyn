import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provider Dashboard | Kosyn AI",
  description:
    "Manage patient access requests, view consented records, and review AI clinical notes.",
};

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
