"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePasskey } from "@/hooks/use-passkey";
import { saveProfileCache } from "@/lib/patient-profile";
import {
  getPatientRegistry,
  ADDRESSES,
  prepareContractCall,
} from "@/lib/contracts";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
  CheckCircle2,
  Key,
  Lock,
  Camera,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CalendarIcon,
  Upload,
  Link2,
} from "lucide-react";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
type RegisterStage =
  | "idle"
  | "encrypting"
  | "uploading"
  | "onchain"
  | "done"
  | "error";
const STAGE_ORDER: RegisterStage[] = [
  "encrypting",
  "uploading",
  "onchain",
  "done",
];
function stageStatus(
  current: RegisterStage,
  target: "encrypting" | "uploading" | "onchain",
): "idle" | "active" | "done" | "error" {
  if (current === "idle") return "idle";
  const ci = STAGE_ORDER.indexOf(current);
  const ti = STAGE_ORDER.indexOf(target);
  if (current === "error")
    return ti < ci ? "done" : ti === ci ? "error" : "idle";
  if (ti < ci) return "done";
  if (ti === ci) return "active";
  return "idle";
}

type Step = 1 | 2 | 3;
type Gender = "male" | "female" | "other" | "prefer-not-to-say" | "";

interface FormData {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  avatarDataUrl?: string;
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}

function ProgressRow({
  label,
  icon,
  status,
}: {
  label: string;
  icon: React.ReactNode;
  status: "idle" | "active" | "done" | "error";
}) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <div
        className={`shrink-0 ${status === "done" ? "text-emerald-400" : status === "active" ? "text-primary" : status === "error" ? "text-red-400" : "text-muted-foreground"}`}
      >
        {status === "done" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : status === "active" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "error" ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          icon
        )}
      </div>
      <span
        className={
          status === "done"
            ? "text-emerald-400"
            : status === "active"
              ? "text-foreground font-medium"
              : status === "error"
                ? "text-red-400"
                : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}

const stepDefs = [
  { n: 1 as Step, label: "Basic Info" },
  { n: 2 as Step, label: "Profile Photo" },
  { n: 3 as Step, label: "Security" },
];

export function PatientOnboarding() {
  const account = useActiveAccount();
  const router = useRouter();
  const {
    register,
    encryptData,
    isLoading: passkeyLoading,
    supported,
  } = usePasskey();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    dateOfBirth: "",
    gender: "",
  });
  const [dobDate, setDobDate] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyCredentialId, setPasskeyCredentialId] = useState<
    string | undefined
  >(undefined);
  const [stage, setStage] = useState<RegisterStage>("idle");
  const [stageError, setStageError] = useState<string | null>(null);
  const [encryptedPreview, setEncryptedPreview] = useState<string | null>(null);
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCompleting =
    stage !== "idle" && stage !== "done" && stage !== "error";
  const contractDeployed = ADDRESSES.patientRegistry !== ZERO_ADDR;

  const step1Valid =
    form.name.trim() !== "" && form.dateOfBirth !== "" && form.gender !== "";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm((f) => ({ ...f, avatarDataUrl: dataUrl }));
  };

  const handlePasskey = async () => {
    setPasskeyError(null);
    const cred = await register(`Kosyn AI - ${form.name}`);
    if (cred) {
      setPasskeyCredentialId(cred.id);
      setPasskeyDone(true);
    } else {
      setPasskeyError(
        "Passkey creation was cancelled or failed. You can try again.",
      );
    }
  };

  const handleComplete = async () => {
    if (!account) return;
    setStageError(null);

    // 1 — Encrypt profile with passkey-derived AES key (triggers biometric)
    setStage("encrypting");
    const profileData = {
      name: form.name,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      ...(form.avatarDataUrl ? { avatarDataUrl: form.avatarDataUrl } : {}),
    };
    const encrypted = await encryptData(JSON.stringify(profileData));
    if (!encrypted) {
      setStage("error");
      setStageError("Encryption cancelled or failed. Please try again.");
      return;
    }
    setEncryptedPreview(JSON.stringify(encrypted).slice(0, 80));

    // 2 — Upload encrypted blob to IPFS via Pinata
    setStage("uploading");
    let cid: string;
    try {
      const res = await fetch("/api/ipfs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encrypted, filename: "kosyn-profile" }),
      });
      const json = (await res.json()) as { cid?: string; error?: string };
      if (!res.ok || !json.cid)
        throw new Error(json.error ?? "IPFS upload failed");
      cid = json.cid;
      setIpfsCid(cid);
    } catch (err) {
      setStage("error");
      setStageError(err instanceof Error ? err.message : "IPFS upload failed");
      return;
    }

    // 3 — Register CID on-chain (skip if PatientRegistry not deployed)
    if (contractDeployed) {
      setStage("onchain");
      try {
        const hashBuf = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(cid),
        );
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("") as `0x${string}`;
        const tx = prepareContractCall({
          contract: getPatientRegistry(),
          method: "register",
          params: [cid, `0x${hashHex}` as `0x${string}`],
        });
        await sendTx(tx);
      } catch (err) {
        setStage("error");
        setStageError(
          err instanceof Error ? err.message : "On-chain registration failed",
        );
        return;
      }
    }

    // Save minimal cache (no plaintext PII)
    saveProfileCache(account.address, {
      profileCid: cid,
      passkeyCredentialId,
      completedAt: new Date().toISOString(),
    });
    setStage("done");
  };

  const avatarSrc =
    form.avatarDataUrl ||
    `https://api.dicebear.com/9.x/shapes/svg?seed=${account?.address ?? "default"}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src="/assets/login-video.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.45)",
        }}
      />

      {/* Center glass panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "580px",
          height: "100%",
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "auto",
          padding: "2rem",
          zIndex: 1,
        }}
      >
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Image src="/kosyn-logo.png" alt="Kosyn" width={28} height={28} />
              <span className="font-semibold text-lg">Kosyn</span>
            </div>
            <h1 className="text-2xl font-bold">Set up your account</h1>
            <p className="text-sm text-muted-foreground">
              Complete your profile before accessing your health records
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {stepDefs.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      step === s.n
                        ? "bg-primary text-primary-foreground"
                        : step > s.n
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span
                    className={`text-xs ${step === s.n ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < stepDefs.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="rounded-lg border border-border p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Popover open={dobOpen} onOpenChange={setDobOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {dobDate ? (
                          format(dobDate, "PPP")
                        ) : (
                          <span className="text-muted-foreground">
                            Pick a date
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[10000]"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={dobDate}
                        onSelect={(date) => {
                          setDobDate(date);
                          setForm((f) => ({
                            ...f,
                            dateOfBirth: date ? format(date, "yyyy-MM-dd") : "",
                          }));
                          setDobOpen(false);
                        }}
                        defaultMonth={dobDate ?? new Date(1990, 0)}
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        disabled={(date) => date > new Date()}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, gender: v as Gender }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Profile Photo */}
          {step === 2 && (
            <div className="rounded-lg border border-border p-6 space-y-5">
              <p className="text-sm text-muted-foreground">
                Upload a profile photo or use a generated avatar. This is
                optional.
              </p>
              <div className="flex flex-col items-center gap-4">
                <img
                  src={avatarSrc}
                  alt="Profile preview"
                  className="h-24 w-24 rounded-full object-cover border-2 border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {form.avatarDataUrl && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() =>
                      setForm((f) => ({ ...f, avatarDataUrl: undefined }))
                    }
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Passkey */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-6 space-y-5">
                <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Why a passkey?
                  </p>
                  <div className="space-y-2.5 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2.5">
                      <Badge
                        variant="outline"
                        className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0"
                      >
                        1
                      </Badge>
                      <span>
                        Your health records are encrypted with a key derived
                        from your{" "}
                        <span className="text-foreground font-medium">
                          device biometrics
                        </span>{" "}
                        (Face ID / Touch ID / Windows Hello) — not a password.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Badge
                        variant="outline"
                        className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0"
                      >
                        2
                      </Badge>
                      <span>
                        The encryption key is derived inside your device and{" "}
                        <span className="text-foreground font-medium">
                          never leaves it
                        </span>
                        . Even Kosyn cannot read your records.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Badge
                        variant="outline"
                        className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0"
                      >
                        3
                      </Badge>
                      <span>
                        When you upload or access records, you&apos;ll briefly
                        see a biometric prompt. This is your device re-deriving
                        the key.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Lock className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">
                      HIPAA-compliant — encryption key never touches our servers
                    </span>
                  </div>
                </div>

                {!supported && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Passkeys are not supported on this device or browser. You
                      can still complete setup, but encryption will be limited.
                    </span>
                  </div>
                )}

                {passkeyDone ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Passkey registered successfully.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handlePasskey}
                      disabled={passkeyLoading || !supported}
                      variant={supported ? "default" : "outline"}
                      className="w-full"
                    >
                      {passkeyLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Waiting for biometric...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Create Passkey
                        </>
                      )}
                    </Button>
                    {passkeyError && (
                      <p className="text-xs text-red-400">{passkeyError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Progress sub-steps */}
              {stage !== "idle" && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <ProgressRow
                    label="Encrypting with passkey"
                    icon={<Key className="h-3.5 w-3.5" />}
                    status={stageStatus(stage, "encrypting")}
                  />
                  {encryptedPreview && (
                    <div className="ml-5 rounded bg-muted/40 border border-border px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground font-mono mb-0.5">
                        Encrypted blob
                      </p>
                      <p className="text-[10px] font-mono text-foreground/70 break-all leading-relaxed">
                        {encryptedPreview}…
                      </p>
                    </div>
                  )}
                  <ProgressRow
                    label="Uploading to IPFS"
                    icon={<Upload className="h-3.5 w-3.5" />}
                    status={stageStatus(stage, "uploading")}
                  />
                  {ipfsCid && (
                    <div className="ml-5 rounded bg-muted/40 border border-border px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground font-mono mb-0.5">
                        IPFS URI
                      </p>
                      <a
                        href={`https://ipfs.io/ipfs/${ipfsCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-primary hover:underline break-all"
                      >
                        ipfs://{ipfsCid}
                      </a>
                    </div>
                  )}
                  {contractDeployed && (
                    <ProgressRow
                      label="Registering on-chain"
                      icon={<Link2 className="h-3.5 w-3.5" />}
                      status={stageStatus(stage, "onchain")}
                    />
                  )}
                  {stage === "error" && stageError && (
                    <p className="text-xs text-red-400 pt-1">{stageError}</p>
                  )}
                </div>
              )}

              {stage === "done" ? (
                <Button
                  onClick={() => router.replace("/patients/dashboard")}
                  className="w-full"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleComplete}
                    disabled={(supported && !passkeyDone) || isCompleting}
                    className="w-full"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : stage === "error" ? (
                      "Retry"
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                  {supported && !passkeyDone && stage === "idle" && (
                    <p className="text-xs text-center text-muted-foreground">
                      Create your passkey above to continue
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
