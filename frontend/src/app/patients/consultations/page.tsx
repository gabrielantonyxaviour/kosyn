"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { DoctorPicker, type Doctor } from "@/components/doctor-picker";
import { CalendarPicker } from "@/components/calendar-picker";
import { PaymentForm } from "@/components/payment-form";
import { DecryptRequest } from "@/components/decrypt-request";
import { CreFeed } from "@/components/cre-feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Globe,
  ExternalLink,
  ShieldCheck,
  FileText,
  Loader2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { getCountryByCode, buildJurisdiction } from "@/lib/locations";
import { LocationCombobox } from "@/components/location-combobox";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  prepareContractCall,
  readContract,
  getBookingRegistry,
  getKosynUSD,
  getPatientConsent,
} from "@/lib/contracts";
import { triggerWorkflow } from "@/lib/cre";
import { useCreLogs, FUJI_EXPLORER } from "@/hooks/use-cre-logs";
import { useOnChainRecords } from "@/hooks/use-onchain-records";
import { usePatientBookings } from "@/hooks/use-bookings";
import { toast } from "sonner";

type Step = "query" | "doctor" | "time" | "payment" | "consent";

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

type MintStatus = "idle" | "processing" | "minted" | "failed";

function BookContent() {
  const account = useActiveAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync: sendTx } = useSendTransaction();
  const [step, setStep] = useState<Step>("query");
  const [query, setQuery] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [city, setCity] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [showConfirm, setShowConfirm] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  // Stripe card payment return state
  const payment = searchParams.get("payment");
  const sessionParam = searchParams.get("session");
  const amountParam = searchParams.get("amount");
  const hasTriggeredRef = useRef(false);
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle");
  const [mintError, setMintError] = useState<string | null>(null);
  const {
    logs: mintLogs,
    push: pushMintLog,
    clear: clearMintLogs,
  } = useCreLogs();

  // Consent step state
  const [patientRecordTypes, setPatientRecordTypes] = useState<string[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [creActive, setCreActive] = useState(false);
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();

  // On-chain records for the connected patient
  const { records: onChainRecords } = useOnChainRecords(account?.address);

  // Existing bookings to prevent duplicate active consultations with same doctor
  const { bookings: existingBookings } = usePatientBookings(account?.address);

  // Handle return from Stripe card payment
  useEffect(() => {
    if (payment !== "success" || !sessionParam || hasTriggeredRef.current)
      return;
    hasTriggeredRef.current = true;

    const storageKey = `cre-consultation-mint-${sessionParam}`;
    const cached = sessionStorage.getItem(storageKey);

    if (cached) {
      const result = JSON.parse(cached) as {
        status: MintStatus;
        error?: string;
      };
      setMintStatus(result.status);
      if (result.error) setMintError(result.error);
      if (result.status === "minted") {
        pushMintLog("OK", "Workflow already completed for this payment");
      } else if (result.status === "failed") {
        pushMintLog("ERR", result.error ?? "Previously failed");
      }
      return;
    }

    async function processCardPayment() {
      setMintStatus("processing");
      clearMintLogs();
      pushMintLog("INFO", "CRE workflow triggered");
      pushMintLog("INFO", "Verifying Stripe payment...");

      try {
        const res = await fetch("/api/stripe/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionParam }),
        });
        const data = await res.json();

        if (!res.ok) {
          pushMintLog("ERR", data.error ?? "Payment processing failed");
          setMintStatus("failed");
          setMintError(data.error ?? "Payment processing failed");
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              status: "failed",
              error: data.error ?? "Payment processing failed",
            }),
          );
          return;
        }

        pushMintLog("OK", `Stripe payment confirmed — $${data.amount} USD`);
        pushMintLog("OK", "Payment verified via Stripe API inside CRE TEE");
        pushMintLog(
          "INFO",
          `Minting ${data.amount} KUSD to ${data.recipientAddress.slice(0, 8)}...`,
        );

        const txHash =
          data.cre?.txHash ?? data.cre?.transactionHash ?? data.cre?.hash;
        if (txHash) {
          pushMintLog(
            "OK",
            "KUSD minted",
            `https://testnet.snowtrace.io/tx/${txHash}`,
          );
        } else {
          pushMintLog("OK", "KUSD minted — CRE EVM Write complete");
        }

        pushMintLog(
          "OK",
          "Workflow complete — KUSD ready for consultation payment",
        );
        setMintStatus("minted");
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ status: "minted" }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        pushMintLog("ERR", msg);
        setMintStatus("failed");
        setMintError(msg);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ status: "failed", error: msg }),
        );
      }
    }

    processCardPayment();
  }, [payment, sessionParam, pushMintLog, clearMintLogs]);

  // If returning from Stripe, show the minting status page instead of the wizard
  const isPostStripeReturn = payment === "success" && !!sessionParam;

  const location =
    selectedCountry && selectedRegion
      ? buildJurisdiction(selectedCountry, selectedRegion)
      : selectedCountry || "";

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setSelectedRegion("");
    setCity("");
  };

  const handleRegionChange = (code: string) => {
    setSelectedRegion(code);
    setCity("");
  };

  const handleQueryContinue = () => {
    if (query) setStep("doctor");
  };

  const handleDoctorSelect = (d: Doctor) => {
    // Check for active (non-completed) booking with same doctor
    const activeBooking = existingBookings.find(
      (b) =>
        b.doctor.toLowerCase() === d.address.toLowerCase() && b.status !== 4,
    );
    if (activeBooking) {
      toast.error(
        `You already have an active consultation with ${d.name}. Complete or cancel it first.`,
      );
      return;
    }
    setDoctor(d);
    setStep("time");
  };

  const handleTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setStep("payment");
  };

  const handlePaymentComplete = async (
    _method: "kusd" | "stripe",
    txHash?: string,
  ) => {
    if (!doctor || !selectedDate || !selectedTime || !account?.address) return;
    if (txHash) setPaymentTxHash(txHash);

    try {
      // 1. Upload booking metadata to IPFS
      const metadata = {
        patientName: `Patient ${account.address.slice(0, 6)}`,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: selectedDate.toISOString().split("T")[0],
        time: selectedTime,
      };
      const pinRes = await fetch("/api/ipfs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: metadata,
          filename: `booking-meta-${Date.now()}`,
        }),
      });
      const { cid: metadataCid } = await pinRes.json();
      if (!metadataCid) {
        toast.error("Failed to upload booking metadata");
        return;
      }

      // 2. Approve KUSD spend (6 decimals)
      const feeAmount = BigInt(Math.round(doctor.fee * 1_000_000));
      const approveTx = prepareContractCall({
        contract: getKosynUSD(),
        method: "approve",
        params: [getBookingRegistry().address as `0x${string}`, feeAmount],
      });
      const approveResult = await sendTx(approveTx);
      toast.success("KUSD approved", {
        description: `${approveResult.transactionHash.slice(0, 10)}...`,
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `${FUJI_EXPLORER}/${approveResult.transactionHash}`,
              "_blank",
            ),
        },
      });

      // 3. Create booking on-chain
      const bookTx = prepareContractCall({
        contract: getBookingRegistry(),
        method: "createBooking",
        params: [doctor.address as `0x${string}`, feeAmount, metadataCid],
      });
      const bookResult = await sendTx(bookTx);
      setPaymentTxHash(bookResult.transactionHash);
      toast.success("Booking created on-chain", {
        description: `${bookResult.transactionHash.slice(0, 10)}...`,
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `${FUJI_EXPLORER}/${bookResult.transactionHash}`,
              "_blank",
            ),
        },
      });

      // 4. Read new booking ID
      const count = await readContract({
        contract: getBookingRegistry(),
        method: "bookingCount",
        params: [],
      });
      const newBookingId = Number(count) - 1;
      setBookingId(newBookingId);

      // 5. Determine patient record types from on-chain records
      const types = [...new Set(onChainRecords.map((r) => r.recordType))];
      setPatientRecordTypes(types);

      if (types.length === 0) {
        // No records — skip consent, go straight to confirmation
        setShowConfirm(true);
      } else {
        // Move to consent step — doctor will request record types later
        setStep("consent");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    }
  };

  const handleConsentApprove = async () => {
    if (bookingId === null || !doctor || !account?.address) return;

    setCreActive(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");

    try {
      // Grant consent on-chain
      pushLog("INFO", "Granting consent on PatientConsent contract...");
      const grantTx = prepareContractCall({
        contract: getPatientConsent(),
        method: "grantAccess",
        params: [doctor.address as `0x${string}`, 0, BigInt(86400)],
      });
      const grantResult = await sendTx(grantTx);
      pushLog(
        "OK",
        "Access granted on-chain",
        `${FUJI_EXPLORER}/${grantResult.transactionHash}`,
      );

      // Update booking status to AccessGranted (2)
      const statusTx = prepareContractCall({
        contract: getBookingRegistry(),
        method: "updateStatus",
        params: [BigInt(bookingId), 2],
      });
      const statusResult = await sendTx(statusTx);
      pushLog(
        "OK",
        "Booking status updated",
        `${FUJI_EXPLORER}/${statusResult.transactionHash}`,
      );

      // Trigger provider-decryption workflow
      pushLog("INFO", "Triggering provider-decryption workflow...");
      const result = await triggerWorkflow("provider-decryption", {
        patientAddress: account.address,
        doctorAddress: doctor.address,
        consultationId: String(bookingId),
        recordTypes: patientRecordTypes,
      });

      if (result.success) {
        if (result.txHash) {
          pushLog(
            "OK",
            `Tx confirmed on Avalanche Fuji`,
            `${FUJI_EXPLORER}/${result.txHash}`,
          );
        }
        pushLog("OK", "Workflow complete");
      } else {
        pushLog("ERR", result.error ?? "Provider decryption workflow failed");
      }

      setConsentGranted(true);
      setCreActive(false);
      setShowConfirm(true);
    } catch (err) {
      pushLog("ERR", err instanceof Error ? err.message : "Consent failed");
      setCreActive(false);
      toast.error(err instanceof Error ? err.message : "Consent failed");
    }
  };

  const handleConsentDeny = () => {
    // Skip consent, show confirmation without granting access
    setShowConfirm(true);
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: "query", label: "Problem", num: 1 },
    { key: "doctor", label: "Doctor", num: 2 },
    { key: "time", label: "Time", num: 3 },
    { key: "payment", label: "Payment", num: 4 },
    { key: "consent", label: "Records", num: 5 },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  const canGoTo = (target: Step) => {
    if (target === "query") return true;
    if (target === "doctor") return !!query;
    if (target === "time") return !!doctor;
    if (target === "payment") return !!selectedDate;
    if (target === "consent") return bookingId !== null;
    return false;
  };

  // Retrieve saved booking context for display after Stripe return
  const bookingContext = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("kosyn-booking-context");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {payment === "cancelled" && (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Payment cancelled. No charges were made. You can try again below.
        </div>
      )}

      {/* Post-Stripe return: minting KUSD */}
      {isPostStripeReturn && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Card Payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {bookingContext
                ? `Consultation with ${bookingContext.doctorName} — $${amountParam}`
                : `Processing $${amountParam} payment`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                {mintStatus === "minted" ? (
                  <>
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-lg font-semibold text-emerald-400">
                          {amountParam} KUSD Minted
                        </p>
                        <p className="text-sm text-muted-foreground">
                          KUSD has been minted to your wallet. You can now book
                          your consultation using KUSD.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/patients/consultations"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Continue Booking
                    </a>
                  </>
                ) : mintStatus === "failed" ? (
                  <>
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-lg font-semibold text-red-400">
                          Minting Failed
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mintError ??
                            "Something went wrong while minting KUSD."}
                        </p>
                      </div>
                    </div>
                    <a
                      href="/patients/consultations"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Try Again
                    </a>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <h2 className="font-semibold">Minting KUSD</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        <div>
                          <p className="text-sm font-medium">
                            Stripe payment confirmed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${amountParam} USD charged successfully
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <Loader2 className="h-5 w-5 shrink-0 text-blue-400 animate-spin" />
                        <div>
                          <p className="text-sm font-medium">
                            CRE payment-mint workflow
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Verifying payment and minting KUSD on-chain...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 p-4">
                        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            On-chain confirmation
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Waiting for {amountParam} KUSD to appear in your
                            wallet...
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      This may take a few seconds. Watch the CRE logs for
                      real-time progress.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col min-h-[400px]">
              <CreFeed workflow="payment-mint" logs={mintLogs} />
            </div>
          </div>
        </div>
      )}

      {/* Normal booking wizard — hidden during Stripe return */}
      {!isPostStripeReturn && (
        <>
          {/* Step indicator — horizontal bar */}
          <div className="flex items-center rounded-lg border border-border divide-x divide-border overflow-hidden">
            {steps.map((s) => {
              const isActive = step === s.key;
              const isDone =
                currentIdx > steps.findIndex((x) => x.key === s.key);
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
                          q.desc
                            .toLowerCase()
                            .includes(querySearch.toLowerCase()),
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

              <div className="space-y-3">
                <label className="text-sm font-medium block">
                  <Globe className="h-3.5 w-3.5 inline mr-1" />
                  Location (optional)
                </label>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <LocationCombobox
                      selectedCountry={selectedCountry}
                      selectedRegion={selectedRegion}
                      city={city}
                      onCountryChange={handleCountryChange}
                      onRegionChange={handleRegionChange}
                      onCityChange={setCity}
                    />
                  </div>
                  <Button
                    onClick={handleQueryContinue}
                    disabled={!query}
                    className="px-6 shrink-0"
                  >
                    Find Doctors
                    <Activity className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Choose Doctor */}
          {step === "doctor" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Choose a Doctor</h2>
                <p className="text-sm text-muted-foreground">
                  Searching {healthQueries.find((q) => q.id === query)?.label}{" "}
                  doctors
                  {selectedCountry
                    ? ` near ${city ? `${city}, ` : ""}${
                        selectedRegion
                          ? `${getCountryByCode(selectedCountry)?.regions.find((r) => r.code === selectedRegion)?.name}, `
                          : ""
                      }${getCountryByCode(selectedCountry)?.name}`
                    : " worldwide"}
                </p>
              </div>
              <DoctorPicker
                onSelect={handleDoctorSelect}
                selectedAddress={doctor?.address}
                query={query ?? undefined}
                location={location}
                activeDoctorAddresses={existingBookings
                  .filter((b) => b.status !== 4)
                  .map((b) => b.doctor)}
              />
            </div>
          )}

          {/* Step 3: Select Time */}
          {step === "time" && (
            <div className="space-y-4">
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
                  <span className="text-muted-foreground">
                    Consultation Fee
                  </span>
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

          {/* Step 5: Records Access / Consent */}
          {step === "consent" && doctor && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Share Records</h2>
                <p className="text-sm text-muted-foreground">
                  Grant{" "}
                  <span className="font-medium text-foreground">
                    {doctor.name}
                  </span>{" "}
                  access to prepare for your consultation
                </p>
              </div>

              {/* Show which record types will be shared */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Records to share
                </p>
                <div className="flex flex-wrap gap-2">
                  {patientRecordTypes.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-xs capitalize"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {patientRecordTypes.length} record type
                  {patientRecordTypes.length !== 1 ? "s" : ""} found in your
                  account. The doctor will review these to prepare for your
                  visit.
                </p>
              </div>

              {!consentGranted && (
                <DecryptRequest
                  doctorName={doctor.name}
                  doctorAddress={doctor.address}
                  recordTypes={patientRecordTypes}
                  onApprove={handleConsentApprove}
                  onDeny={handleConsentDeny}
                />
              )}

              {consentGranted && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">
                      Access granted
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Records decrypted inside CRE TEE. {doctor.name} can now
                      review your data.
                    </p>
                  </div>
                </div>
              )}

              {creActive && (
                <CreFeed workflow="provider-decryption" logs={creLogs} />
              )}
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
              <div className="space-y-3 text-sm">
                <p>
                  Your consultation with{" "}
                  <span className="font-medium">{doctor?.name}</span> has been
                  booked.
                </p>
                {paymentTxHash && (
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Payment Transaction
                    </p>
                    <a
                      href={`https://testnet.snowtrace.io/tx/${paymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary hover:underline flex items-center gap-1 break-all"
                    >
                      {paymentTxHash}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                {consentGranted ? (
                  <p className="text-muted-foreground">
                    Records have been shared with {doctor?.name}. They can now
                    review your data before the consultation.
                  </p>
                ) : patientRecordTypes.length === 0 ? (
                  <p className="text-muted-foreground">
                    You have no health records yet. Upload records from your
                    dashboard so your doctor can review them before the
                    consultation.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    You skipped sharing records. You can grant access later from
                    the consultation page.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/patients/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    router.push(`/patients/consultation/${bookingId}`)
                  }
                >
                  View Consultation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookContent />
    </Suspense>
  );
}
