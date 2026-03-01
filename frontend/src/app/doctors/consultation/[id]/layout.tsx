import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultation | Kosyn AI",
  description:
    "View patient records and AI clinical analysis for this consultation session.",
};

export default function DoctorConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
