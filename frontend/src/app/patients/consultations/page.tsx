"use client";

import { useState } from "react";
import { DoctorPicker, type Doctor } from "@/components/doctor-picker";
import { CalendarPicker } from "@/components/calendar-picker";
import { PaymentForm } from "@/components/payment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Stethoscope,
  Heart,
  Brain,
  Eye,
  Bone,
  Smile,
  Activity,
  ArrowLeft,
  MapPin,
  Search,
} from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/demo-api";

type Step = "query" | "doctor" | "time" | "payment";

const healthQueries = [
  {
    id: "general-checkup",
    label: "General Checkup",
    icon: Stethoscope,
    desc: "Routine examination, vitals, preventive care",
    color: "text-blue-400",
  },
  {
    id: "heart-cardiovascular",
    label: "Heart & Cardiovascular",
    icon: Heart,
    desc: "Chest pain, blood pressure, heart rhythm",
    color: "text-red-400",
  },
  {
    id: "skin-hair",
    label: "Skin & Hair",
    icon: Eye,
    desc: "Rashes, acne, skin screening, hair loss",
    color: "text-amber-400",
  },
  {
    id: "brain-nerves",
    label: "Brain & Nerves",
    icon: Brain,
    desc: "Headaches, numbness, seizures, memory",
    color: "text-purple-400",
  },
  {
    id: "mental-health",
    label: "Mental Health",
    icon: Smile,
    desc: "Anxiety, depression, stress, sleep issues",
    color: "text-emerald-400",
  },
  {
    id: "bones-joints",
    label: "Bones & Joints",
    icon: Bone,
    desc: "Back pain, sports injuries, joint stiffness",
    color: "text-orange-400",
  },
];

export default function BookPage() {
  const account = useActiveAccount();
  const router = useRouter();
  const [step, setStep] = useState<Step>("query");
  const [query, setQuery] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQueryContinue = () => {
    if (query) setStep("doctor");
  };

  const handleDoctorSelect = (d: Doctor) => {
    setDoctor(d);
    setStep("time");
  };

  const handleTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setStep("payment");
  };

  const handlePaymentComplete = async () => {
    if (!doctor || !selectedDate || !selectedTime) return;
    await createBooking({
      patientAddress:
        account?.address ?? "0x0000000000000000000000000000000000000000",
      patientName: account?.address
        ? `Patient ${account.address.slice(0, 6)}`
        : "Patient",
      doctorAddress: doctor.address,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      date: selectedDate.toISOString().split("T")[0],
      time: selectedTime,
      fee: doctor.fee,
    });
    setShowConfirm(true);
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: "query", label: "Problem", num: 1 },
    { key: "doctor", label: "Doctor", num: 2 },
    { key: "time", label: "Time", num: 3 },
    { key: "payment", label: "Payment", num: 4 },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  const canGoTo = (target: Step) => {
    if (target === "query") return true;
    if (target === "doctor") return !!query;
    if (target === "time") return !!doctor;
    if (target === "payment") return !!selectedDate;
    return false;
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Step indicator — horizontal bar */}
      <div className="flex items-center rounded-lg border border-border divide-x divide-border overflow-hidden">
        {steps.map((s) => {
          const isActive = step === s.key;
          const isDone = currentIdx > steps.findIndex((x) => x.key === s.key);
          return (
            <button
              key={s.key}
              onClick={() => canGoTo(s.key) && setStep(s.key)}
              disabled={!canGoTo(s.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDone
                    ? "bg-muted/30 text-foreground"
                    : "text-muted-foreground"
              } ${canGoTo(s.key) ? "cursor-pointer hover:bg-muted/50" : "cursor-default"}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs mr-2 ${
                  isDone
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step 1: Problem & Location */}
      {step === "query" && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              What do you need help with?
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a health concern and your location to find matching
              doctors.
            </p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={querySearch}
                onChange={(e) => setQuerySearch(e.target.value)}
                placeholder="Search health concerns..."
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                    Description
                  </th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {healthQueries
                  .filter(
                    (q) =>
                      querySearch === "" ||
                      q.label
                        .toLowerCase()
                        .includes(querySearch.toLowerCase()) ||
                      q.desc.toLowerCase().includes(querySearch.toLowerCase()),
                  )
                  .map((q) => {
                    const Icon = q.icon;
                    const isSelected = query === q.id;
                    return (
                      <tr
                        key={q.id}
                        onClick={() => setQuery(q.id)}
                        className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Icon className={`h-4 w-4 ${q.color}`} />
                        </td>
                        <td className="px-4 py-3 font-medium">{q.label}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {q.desc}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSelected && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Selected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Location (optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. CA, NY, TX"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button
              onClick={handleQueryContinue}
              disabled={!query}
              className="px-6"
            >
              Find Doctors
              <Activity className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Doctor */}
      {step === "doctor" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("query")}
              className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Choose a Doctor</h2>
              <p className="text-sm text-muted-foreground">
                {healthQueries.find((q) => q.id === query)?.label} doctors
                {location ? ` in ${location.toUpperCase()}` : ""}
              </p>
            </div>
          </div>
          <DoctorPicker
            onSelect={handleDoctorSelect}
            selectedAddress={doctor?.address}
            query={query ?? undefined}
            location={location}
          />
        </div>
      )}

      {/* Step 3: Select Time */}
      {step === "time" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("doctor")}
              className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Select a Time</h2>
              <p className="text-sm text-muted-foreground">
                Booking with{" "}
                <span className="font-medium text-foreground">
                  {doctor?.name}
                </span>{" "}
                — {doctor?.specialty}
              </p>
            </div>
          </div>
          <CalendarPicker
            onSelect={handleTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        </div>
      )}

      {/* Step 4: Payment */}
      {step === "payment" && doctor && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("time")}
              className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Confirm & Pay</h2>
              <p className="text-sm text-muted-foreground">
                {doctor.name} —{" "}
                {selectedDate &&
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(selectedDate)}{" "}
                at {selectedTime}
              </p>
            </div>
          </div>

          {/* Booking summary */}
          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Doctor</span>
              <span className="font-medium">{doctor.name}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Specialty</span>
              <span>{doctor.specialty}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Date & Time</span>
              <span>
                {selectedDate &&
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(selectedDate)}{" "}
                at {selectedTime}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Consultation Fee</span>
              <span className="font-semibold">${doctor.fee} KUSD</span>
            </div>
          </div>

          <PaymentForm
            amount={doctor.fee}
            doctorName={doctor.name}
            doctorAddress={doctor.address}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Booking Confirmed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Your consultation with{" "}
              <span className="font-medium">{doctor?.name}</span> has been
              booked.
            </p>
            <p className="text-muted-foreground">
              You will receive a notification when the doctor requests access to
              your records. Approve with your passkey to begin the consultation.
            </p>
          </div>
          <Button onClick={() => router.push("/patients/dashboard")}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
