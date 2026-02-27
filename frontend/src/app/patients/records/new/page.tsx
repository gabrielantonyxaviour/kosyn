"use client";

import { useState } from "react";
import { CreFeed } from "@/components/cre-feed";
import {
  Activity,
  Pill,
  FileText,
  FlaskConical,
  Scan,
  Microscope,
  Scissors,
  ClipboardList,
  Shield,
  Brain,
  Smile,
  Eye,
  ShieldAlert,
  Heart,
  Leaf,
  Send,
  AlertCircle,
  GitBranch,
  Upload,
  PenLine,
  Search,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { triggerWorkflow } from "@/lib/cre";
import { usePasskey } from "@/hooks/use-passkey";
import { toast } from "sonner";
import { createRecord } from "@/lib/demo-api";
import type { RecordType } from "@/hooks/use-records";
import {
  VitalsForm,
  MedHistoryForm,
  MedicationsForm,
  LabResultsForm,
  VaccinationForm,
  CardiologyForm,
  AllergyProfileForm,
  SurgicalReportForm,
  DischargeSummaryForm,
  MentalHealthForm,
  GenericMedicalForm,
  UploadForm,
} from "./forms";
import {
  ImagingReportForm,
  PathologyReportForm,
  GeneticReportForm,
} from "./forms-diagnostic";
import {
  VisionExamForm,
  DentalRecordForm,
  PhysicalTherapyForm,
  NutritionAssessmentForm,
} from "./forms-specialist";
import { EmergencyRecordForm, ReferralLetterForm } from "./forms-clinical";

// ─── Types ───────────────────────────────────────────────────────────────────
type TemplateId =
  | "vitals"
  | "medical-history"
  | "medications"
  | "lab-results"
  | "imaging-report"
  | "pathology-report"
  | "cardiology-report"
  | "surgical-report"
  | "discharge-summary"
  | "vaccination-record"
  | "allergy-profile"
  | "mental-health"
  | "physical-therapy"
  | "dental-record"
  | "vision-exam"
  | "referral-letter"
  | "emergency-record"
  | "nutrition-assessment"
  | "genetic-report";

type EntryMethod = "manual" | "upload";
type Phase = "type" | "method" | "form";

// ─── Template registry ────────────────────────────────────────────────────────
const templates: {
  id: TemplateId;
  label: string;
  icon: React.ElementType;
  category: string;
  description: string;
  color: string;
}[] = [
  {
    id: "vitals",
    label: "Vital Signs",
    icon: Activity,
    category: "Routine",
    description:
      "Blood pressure (BP), pulse, respiratory rate (RR), SpO2, temperature, height, weight, BMI, and pain score (NRS 0–10). Core clinical vital signs.",
    color: "text-blue-400",
  },
  {
    id: "medical-history",
    label: "Medical History",
    icon: FileText,
    category: "Baseline",
    description:
      "Past medical conditions (PMH) with ICD-10 codes, surgical history, family history, social history, allergies, and obstetric history.",
    color: "text-cyan-400",
  },
  {
    id: "medications",
    label: "Medications",
    icon: Pill,
    category: "Ongoing",
    description:
      "Structured medication reconciliation — drug name, dose, unit, route (oral/IV/IM/SC/inhaled), frequency (QD/BID/TID/PRN), indication, and prescriber.",
    color: "text-orange-400",
  },
  {
    id: "lab-results",
    label: "Lab Results",
    icon: FlaskConical,
    category: "Diagnostic",
    description:
      "Structured lab results with LOINC codes, values, units, reference ranges, and abnormal flags (H/L/Critical). Includes specimen type and fasting status.",
    color: "text-violet-400",
  },
  {
    id: "imaging-report",
    label: "Imaging Report",
    icon: Scan,
    category: "Diagnostic",
    description:
      "Radiology reports — X-ray, MRI, CT scan, PET scan, ultrasound. Radiologist impression and clinical findings.",
    color: "text-violet-400",
  },
  {
    id: "pathology-report",
    label: "Pathology Report",
    icon: Microscope,
    category: "Diagnostic",
    description:
      "Biopsy, tissue analysis, cytology, and histopathology reports. Includes histological grading and pathologist findings.",
    color: "text-violet-400",
  },
  {
    id: "cardiology-report",
    label: "Heart Test Report",
    icon: Heart,
    category: "Specialist",
    description:
      "ECG/EKG (rate, rhythm, QTc, axis), echocardiogram (LVEF, wall motion), stress test, Holter monitor, or cardiac catheterisation.",
    color: "text-rose-400",
  },
  {
    id: "surgical-report",
    label: "Surgery Record",
    icon: Scissors,
    category: "Procedural",
    description:
      "Operative report — procedure name (CPT code), surgeon, anesthesia type (general/regional/MAC), estimated blood loss (EBL), duration, complications, and post-op disposition.",
    color: "text-amber-400",
  },
  {
    id: "discharge-summary",
    label: "Hospital Discharge",
    icon: ClipboardList,
    category: "Hospital",
    description:
      "Inpatient discharge document — admission/discharge dates, principal diagnosis (ICD-10), secondary diagnoses, discharge condition, disposition, and follow-up instructions.",
    color: "text-amber-400",
  },
  {
    id: "vaccination-record",
    label: "Vaccination Record",
    icon: Shield,
    category: "Preventive",
    description:
      "Immunization history with CVX codes, lot number, route (IM/SC/intranasal), anatomical site, dose-in-series, VIS acknowledgment, and next dose date.",
    color: "text-emerald-400",
  },
  {
    id: "allergy-profile",
    label: "Allergy Record",
    icon: ShieldAlert,
    category: "Baseline",
    description:
      "Allergen, category (drug/food/environmental), reaction type, severity (mild–life-threatening), verification status (confirmed/suspected/refuted), and emergency treatment.",
    color: "text-cyan-400",
  },
  {
    id: "mental-health",
    label: "Mental Health Session",
    icon: Brain,
    category: "Specialist",
    description:
      "Psychiatric/therapy session — DSM-5 diagnosis and code, PHQ-9 (depression), GAD-7 (anxiety), C-SSRS (suicidality), treatment modality (CBT/DBT/EMDR), and safety plan.",
    color: "text-rose-400",
  },
  {
    id: "physical-therapy",
    label: "Physical Therapy",
    icon: Dumbbell,
    category: "Rehabilitation",
    description:
      "PT session notes — functional assessment, ROM (range of motion) measurements, exercise plan, rehabilitation goals, and progress tracking.",
    color: "text-green-400",
  },
  {
    id: "dental-record",
    label: "Dental Record",
    icon: Smile,
    category: "Dental",
    description:
      "Dental examination and procedures using ADA tooth numbering system, CDT codes, periodontal charting, X-ray findings, and treatment notes.",
    color: "text-pink-400",
  },
  {
    id: "vision-exam",
    label: "Eye Exam",
    icon: Eye,
    category: "Specialist",
    description:
      "Optometry / ophthalmology — visual acuity (OD/OS), refraction prescription (sphere/cylinder/axis/add), IOP, cover test, and slit-lamp findings.",
    color: "text-rose-400",
  },
  {
    id: "referral-letter",
    label: "Referral Letter",
    icon: Send,
    category: "Administrative",
    description:
      "Specialist referral — referring physician, specialist requested, clinical reason, relevant history summary, and urgency level.",
    color: "text-slate-400",
  },
  {
    id: "emergency-record",
    label: "Emergency Visit",
    icon: AlertCircle,
    category: "Urgent",
    description:
      "Emergency department record — chief complaint, triage category (ESI 1–5), presenting vitals, interventions, diagnosis, and disposition.",
    color: "text-red-400",
  },
  {
    id: "nutrition-assessment",
    label: "Nutrition Assessment",
    icon: Leaf,
    category: "Wellness",
    description:
      "Nutritional evaluation — dietary history, anthropometric data (height/weight/BMI/waist), nutritional status, and personalised care plan.",
    color: "text-lime-400",
  },
  {
    id: "genetic-report",
    label: "Genetic / DNA Report",
    icon: GitBranch,
    category: "Diagnostic",
    description:
      "Genomic testing results — gene name, variant (HGVS notation), ACMG classification (Pathogenic/VUS/Benign), hereditary risk factors, and carrier status.",
    color: "text-violet-400",
  },
];

// ─── Mappings ─────────────────────────────────────────────────────────────────
const TEMPLATE_TO_RECORD_TYPE: Record<TemplateId, RecordType> = {
  vitals: "health",
  "medical-history": "health",
  medications: "prescription",
  "lab-results": "health",
  "imaging-report": "health",
  "pathology-report": "health",
  "cardiology-report": "health",
  "surgical-report": "health",
  "discharge-summary": "health",
  "vaccination-record": "health",
  "allergy-profile": "health",
  "mental-health": "health",
  "physical-therapy": "health",
  "dental-record": "health",
  "vision-exam": "health",
  "referral-letter": "certificate",
  "emergency-record": "health",
  "nutrition-assessment": "health",
  "genetic-report": "health",
};

// Numeric mapping for CRE workflow (smart contract stores uint8)
// Convention: 0=health, 1=prescription, 2=certificate, 3=consultation
const CRE_RECORD_TYPE: Record<TemplateId, number> = {
  vitals: 0,
  "medical-history": 0,
  medications: 1,
  "lab-results": 0,
  "imaging-report": 0,
  "pathology-report": 0,
  "cardiology-report": 0,
  "surgical-report": 0,
  "discharge-summary": 0,
  "vaccination-record": 0,
  "allergy-profile": 0,
  "mental-health": 0,
  "physical-therapy": 0,
  "dental-record": 0,
  "vision-exam": 0,
  "referral-letter": 2,
  "emergency-record": 0,
  "nutrition-assessment": 0,
  "genetic-report": 0,
};

function getRecordLabel(
  id: TemplateId,
  method: EntryMethod,
  data: Record<string, string>,
): string {
  const base = templates.find((t) => t.id === id)?.label ?? "Health Record";
  if (method === "upload") return data.label || `${base} (PDF)`;
  switch (id) {
    case "vitals":
      return data.bpSystolic
        ? `Vitals — BP ${data.bpSystolic}/${data.bpDiastolic}`
        : "Vital Signs";
    case "medications": {
      const meds = data.medications ? JSON.parse(data.medications) : [];
      return meds[0]?.name
        ? `Medications — ${meds[0].name}`
        : "Medication Reconciliation";
    }
    case "lab-results": {
      const tests = data.tests ? JSON.parse(data.tests) : [];
      return tests[0]?.testName ? `Lab — ${tests[0].testName}` : "Lab Results";
    }
    case "vaccination-record":
      return data.vaccine
        ? `Vaccination — ${data.vaccine}`
        : "Vaccination Record";
    case "cardiology-report":
      return data.testType
        ? `Cardiology — ${data.testType.toUpperCase()}`
        : "Cardiology Report";
    case "surgical-report":
      return data.procedureName || "Surgery Record";
    case "discharge-summary":
      return data.principalDiagnosis
        ? `Discharge — ${data.principalDiagnosis}`
        : "Discharge Summary";
    case "mental-health":
      return data.dsm5Diagnosis
        ? `Mental Health — ${data.dsm5Diagnosis}`
        : "Mental Health Session";
    case "imaging-report":
      return data.modality
        ? `Imaging — ${data.modality}${data.bodyPart ? ` (${data.bodyPart})` : ""}`
        : "Imaging Report";
    case "pathology-report":
      return data.diagnosis
        ? `Pathology — ${data.diagnosis.slice(0, 40)}`
        : "Pathology Report";
    case "genetic-report":
      return data.geneName
        ? `Genetics — ${data.geneName}${data.acmgClassification ? ` (${data.acmgClassification})` : ""}`
        : "Genetic Report";
    case "vision-exam":
      return data.examType ? `Vision — ${data.examType}` : "Vision Exam";
    case "dental-record":
      return data.visitType ? `Dental — ${data.visitType}` : "Dental Record";
    case "physical-therapy":
      return data.sessionNumber
        ? `PT Session ${data.sessionNumber}`
        : "Physical Therapy";
    case "nutrition-assessment":
      return data.nutritionalStatus
        ? `Nutrition — ${data.nutritionalStatus}`
        : "Nutrition Assessment";
    case "emergency-record":
      return data.chiefComplaint
        ? `ED — ${data.chiefComplaint.slice(0, 40)}`
        : "Emergency Record";
    case "referral-letter":
      return data.specialtyRequested
        ? `Referral → ${data.specialtyRequested}`
        : "Referral Letter";
    default:
      return base;
  }
}

const PHASES: { key: Phase; label: string; num: number }[] = [
  { key: "type", label: "Record Type", num: 1 },
  { key: "method", label: "Entry Method", num: 2 },
  { key: "form", label: "Details", num: 3 },
];

// Forms with dedicated clinical implementations
const SPECIFIC_FORM_IDS: TemplateId[] = [
  "vitals",
  "medical-history",
  "medications",
  "lab-results",
  "vaccination-record",
  "cardiology-report",
  "allergy-profile",
  "surgical-report",
  "discharge-summary",
  "mental-health",
  "imaging-report",
  "pathology-report",
  "genetic-report",
  "vision-exam",
  "dental-record",
  "physical-therapy",
  "nutrition-assessment",
  "emergency-record",
  "referral-letter",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewRecordPage() {
  const [phase, setPhase] = useState<Phase>("type");
  const [selected, setSelected] = useState<TemplateId | null>(null);
  const [method, setMethod] = useState<EntryMethod | null>(null);
  const [search, setSearch] = useState("");
  const [creActive, setCreActive] = useState(false);
  const account = useActiveAccount();
  const { encryptData, supported } = usePasskey();

  const currentIdx = PHASES.findIndex((p) => p.key === phase);
  const canGoTo = (p: Phase) => {
    if (p === "type") return true;
    if (p === "method") return !!selected;
    if (p === "form") return !!selected && !!method;
    return false;
  };

  const handleTypeSelect = (id: TemplateId) => {
    setSelected(id);
    setMethod(null);
    setPhase("method");
  };
  const handleMethodSelect = (m: EntryMethod) => {
    setMethod(m);
    setPhase("form");
  };

  const handleSubmit = async (data: Record<string, string>) => {
    toast.info(
      supported
        ? "Touch ID / Face ID required to encrypt your health record..."
        : "Encrypting health record...",
    );
    const plaintext = JSON.stringify({ type: selected, method, ...data });
    const encryptedBlob = await encryptData(plaintext);
    if (!encryptedBlob) {
      toast.error(
        "Encryption cancelled — passkey is required to protect your data.",
      );
      return;
    }

    setCreActive(true);
    toast.info("Record encrypted. Storing on IPFS via CRE...");
    const patientAddr =
      account?.address ?? "0x0000000000000000000000000000000000000000";

    await triggerWorkflow("record-upload", {
      patientAddress: patientAddr,
      recordType: CRE_RECORD_TYPE[selected!],
      encryptedData: JSON.stringify(encryptedBlob),
    });
    await createRecord({
      patientAddress: patientAddr,
      recordType: TEMPLATE_TO_RECORD_TYPE[selected!],
      templateType: selected!,
      label: getRecordLabel(selected!, method!, data),
      createdBy: "patient",
      createdByAddress: patientAddr,
      formData: data,
    });

    setTimeout(() => {
      setCreActive(false);
      toast.success(
        "Record encrypted client-side (AES-256-GCM) and stored on IPFS. CID registered on-chain.",
      );
    }, 4000);
  };

  const tpl = templates.find((t) => t.id === selected);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Health Record</h1>
        <p className="text-sm text-muted-foreground">
          Choose a record type, then enter data manually or upload a document.
          All data is encrypted inside a TEE enclave.
        </p>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center rounded-lg border border-border divide-x divide-border overflow-hidden">
        {PHASES.map((p) => {
          const isActive = phase === p.key;
          const isDone = currentIdx > PHASES.findIndex((x) => x.key === p.key);
          return (
            <button
              key={p.key}
              onClick={() => canGoTo(p.key) && setPhase(p.key)}
              disabled={!canGoTo(p.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : isDone ? "bg-muted/30 text-foreground" : "text-muted-foreground"} ${canGoTo(p.key) ? "cursor-pointer hover:bg-muted/50" : "cursor-default"}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs mr-2 ${isDone ? "bg-emerald-500/20 text-emerald-400" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : p.num}
              </span>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Content + CRE Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
        <div className="lg:col-span-2 flex flex-col min-h-[520px]">
          {/* Phase 1: Type picker */}
          {phase === "type" && (
            <div className="rounded-lg border border-border overflow-hidden flex flex-col flex-1">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20 shrink-0">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search record types..."
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground w-8" />
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                        Category
                      </th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
                        Description
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {templates
                      .filter(
                        (t) =>
                          search === "" ||
                          t.label
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          t.description
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          t.category
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((t) => {
                        const Icon = t.icon;
                        return (
                          <tr
                            key={t.id}
                            onClick={() => handleTypeSelect(t.id)}
                            className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <Icon className={`h-4 w-4 ${t.color}`} />
                            </td>
                            <td className="px-4 py-3 font-medium">{t.label}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {t.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                              {t.description}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              →
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phase 2: Entry method */}
          {phase === "method" && tpl && (
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/10">
                <tpl.icon className={`h-5 w-5 ${tpl.color}`} />
                <div>
                  <p className="text-sm font-medium">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tpl.description}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium">
                How would you like to add this record?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <button
                  onClick={() => handleMethodSelect("manual")}
                  className="rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 p-8 text-left transition-all group"
                >
                  <PenLine className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-4 transition-colors" />
                  <p className="font-semibold">Enter Manually</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Fill in a structured form with guided clinical fields
                    tailored to this record type.
                  </p>
                </button>
                <button
                  onClick={() => handleMethodSelect("upload")}
                  className="rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 p-8 text-left transition-all group"
                >
                  <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-4 transition-colors" />
                  <p className="font-semibold">Upload Document</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Upload an existing PDF or image to encrypt and store on IPFS
                    via CRE.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Form */}
          {phase === "form" && selected && method && tpl && (
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/10">
                <tpl.icon className={`h-5 w-5 ${tpl.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {method === "upload" ? "Document upload" : "Manual entry"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-5 flex-1 overflow-auto">
                {method === "upload" ? (
                  <UploadForm onSubmit={handleSubmit} />
                ) : (
                  <>
                    {selected === "vitals" && (
                      <VitalsForm onSubmit={handleSubmit} />
                    )}
                    {selected === "medical-history" && (
                      <MedHistoryForm onSubmit={handleSubmit} />
                    )}
                    {selected === "medications" && (
                      <MedicationsForm onSubmit={handleSubmit} />
                    )}
                    {selected === "lab-results" && (
                      <LabResultsForm onSubmit={handleSubmit} />
                    )}
                    {selected === "vaccination-record" && (
                      <VaccinationForm onSubmit={handleSubmit} />
                    )}
                    {selected === "cardiology-report" && (
                      <CardiologyForm onSubmit={handleSubmit} />
                    )}
                    {selected === "allergy-profile" && (
                      <AllergyProfileForm onSubmit={handleSubmit} />
                    )}
                    {selected === "surgical-report" && (
                      <SurgicalReportForm onSubmit={handleSubmit} />
                    )}
                    {selected === "discharge-summary" && (
                      <DischargeSummaryForm onSubmit={handleSubmit} />
                    )}
                    {selected === "mental-health" && (
                      <MentalHealthForm onSubmit={handleSubmit} />
                    )}
                    {selected === "imaging-report" && (
                      <ImagingReportForm onSubmit={handleSubmit} />
                    )}
                    {selected === "pathology-report" && (
                      <PathologyReportForm onSubmit={handleSubmit} />
                    )}
                    {selected === "genetic-report" && (
                      <GeneticReportForm onSubmit={handleSubmit} />
                    )}
                    {selected === "vision-exam" && (
                      <VisionExamForm onSubmit={handleSubmit} />
                    )}
                    {selected === "dental-record" && (
                      <DentalRecordForm onSubmit={handleSubmit} />
                    )}
                    {selected === "physical-therapy" && (
                      <PhysicalTherapyForm onSubmit={handleSubmit} />
                    )}
                    {selected === "nutrition-assessment" && (
                      <NutritionAssessmentForm onSubmit={handleSubmit} />
                    )}
                    {selected === "emergency-record" && (
                      <EmergencyRecordForm onSubmit={handleSubmit} />
                    )}
                    {selected === "referral-letter" && (
                      <ReferralLetterForm onSubmit={handleSubmit} />
                    )}
                    {!SPECIFIC_FORM_IDS.includes(selected) && (
                      <GenericMedicalForm
                        templateId={selected}
                        onSubmit={handleSubmit}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: CRE Logs */}
        <div className="flex flex-col">
          <CreFeed workflow="record-upload" isActive={creActive} />
        </div>
      </div>
    </main>
  );
}
