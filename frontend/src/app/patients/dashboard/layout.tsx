import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Dashboard | Kosyn AI",
  description:
    "View your health records, AI insights, and manage provider consents.",
};

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
