import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultation | Kosyn AI",
  description:
    "View consultation details and AI-generated clinical analysis for this session.",
};

export default function PatientConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
