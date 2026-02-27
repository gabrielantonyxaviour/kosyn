import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultations | Kosyn AI",
  description:
    "Review your past and upcoming consultations with AI-generated clinical notes.",
};

export default function ConsultationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
