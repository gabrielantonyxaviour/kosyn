"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Plus, Trash2, Upload } from "lucide-react";

export type SubmitFn = (d: Record<string, string>) => void;

// ─── Shared helpers ───────────────────────────────────────────────────────────
export function F({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm hover:bg-accent"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {value || <span className="text-muted-foreground">Pick a date</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(d.toISOString().split("T")[0]);
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function Sel({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

// ─── 1. Vitals ────────────────────────────────────────────────────────────────
export function VitalsForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    date: "",
    time: "",
    bpSystolic: "",
    bpDiastolic: "",
    bpArm: "",
    position: "",
    heartRate: "",
    respiratoryRate: "",
    height: "",
    weight: "",
    temperature: "",
    tempMethod: "",
    spo2: "",
    painScore: "",
    notes: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const bmi = useMemo(() => {
    const h = parseFloat(f.height);
    const w = parseFloat(f.weight);
    if (h > 0 && w > 0) return (w / (h / 100) ** 2).toFixed(1);
    return "";
  }, [f.height, f.weight]);

  const handleSubmit = () => onSubmit({ ...f, bmi });

  return (
    <div className="space-y-4">
      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
        <F label="Date of Measurement">
          <DateField value={f.date} onChange={(v) => u("date", v)} />
        </F>
        <F label="Time of Measurement">
          <Input
            type="time"
            value={f.time}
            onChange={(e) => u("time", e.target.value)}
            className="h-9"
          />
        </F>
      </div>

      {/* Blood Pressure */}
      <div className="rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Blood Pressure (BP)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <F label="Systolic (mmHg)">
            <Input
              placeholder="120"
              value={f.bpSystolic}
              onChange={(e) => u("bpSystolic", e.target.value)}
            />
          </F>
          <F label="Diastolic (mmHg)">
            <Input
              placeholder="80"
              value={f.bpDiastolic}
              onChange={(e) => u("bpDiastolic", e.target.value)}
            />
          </F>
          <F label="BP Arm">
            <Sel
              value={f.bpArm}
              onValueChange={(v) => u("bpArm", v)}
              placeholder="Select arm"
            >
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="left">Left</SelectItem>
            </Sel>
          </F>
          <F label="Patient Position">
            <Sel
              value={f.position}
              onValueChange={(v) => u("position", v)}
              placeholder="Select position"
            >
              <SelectItem value="sitting">Sitting</SelectItem>
              <SelectItem value="standing">Standing</SelectItem>
              <SelectItem value="supine">Supine (lying)</SelectItem>
            </Sel>
          </F>
        </div>
      </div>

      {/* Heart + Respiratory Rate */}
      <div className="grid grid-cols-2 gap-4">
        <F label="Heart Rate / Pulse (bpm)">
          <Input
            placeholder="72"
            value={f.heartRate}
            onChange={(e) => u("heartRate", e.target.value)}
          />
        </F>
        <F label="Respiratory Rate (breaths/min)">
          <Input
            placeholder="16"
            value={f.respiratoryRate}
            onChange={(e) => u("respiratoryRate", e.target.value)}
          />
        </F>
      </div>

      {/* Height / Weight / BMI */}
      <div className="grid grid-cols-3 gap-4">
        <F label="Height (cm)">
          <Input
            placeholder="170"
            value={f.height}
            onChange={(e) => u("height", e.target.value)}
          />
        </F>
        <F label="Weight (kg)">
          <Input
            placeholder="75"
            value={f.weight}
            onChange={(e) => u("weight", e.target.value)}
          />
        </F>
        <F label="BMI (auto-calculated)">
          <Input
            value={bmi ? `${bmi} kg/m²` : ""}
            readOnly
            placeholder="—"
            className="bg-muted/30 text-muted-foreground"
          />
        </F>
      </div>

      {/* Temperature */}
      <div className="grid grid-cols-2 gap-4">
        <F label="Temperature (°C)">
          <Input
            placeholder="36.6"
            value={f.temperature}
            onChange={(e) => u("temperature", e.target.value)}
          />
        </F>
        <F label="Temperature Method">
          <Sel
            value={f.tempMethod}
            onValueChange={(v) => u("tempMethod", v)}
            placeholder="Method"
          >
            <SelectItem value="oral">Oral (Sublingual)</SelectItem>
            <SelectItem value="axillary">Axillary (Armpit)</SelectItem>
            <SelectItem value="rectal">Rectal</SelectItem>
            <SelectItem value="tympanic">Tympanic (Ear)</SelectItem>
            <SelectItem value="temporal">Temporal (Forehead)</SelectItem>
          </Sel>
        </F>
      </div>

      {/* SpO2 + Pain Score */}
      <div className="grid grid-cols-2 gap-4">
        <F label="O2 Saturation / SpO2 (%)">
          <Input
            placeholder="98"
            value={f.spo2}
            onChange={(e) => u("spo2", e.target.value)}
          />
        </F>
        <F label="Pain Score — NRS (0 = no pain, 10 = worst)">
          <Sel
            value={f.painScore}
            onValueChange={(v) => u("painScore", v)}
            placeholder="0–10"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {i} —{" "}
                {i === 0
                  ? "No pain"
                  : i <= 3
                    ? "Mild"
                    : i <= 6
                      ? "Moderate"
                      : i <= 9
                        ? "Severe"
                        : "Worst possible"}
              </SelectItem>
            ))}
          </Sel>
        </F>
      </div>

      <F label="Clinical Notes">
        <Textarea
          placeholder="Additional observations, context, or symptoms..."
          value={f.notes}
          onChange={(e) => u("notes", e.target.value)}
        />
      </F>
      <Button onClick={handleSubmit}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 2. Medications ───────────────────────────────────────────────────────────
type MedRow = {
  id: string;
  name: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  status: string;
  startDate: string;
  indication: string;
  prescribedBy: string;
};

const newMed = (): MedRow => ({
  id: crypto.randomUUID(),
  name: "",
  dose: "",
  unit: "mg",
  route: "",
  frequency: "",
  status: "active",
  startDate: "",
  indication: "",
  prescribedBy: "",
});

export function MedicationsForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [meds, setMeds] = useState<MedRow[]>([newMed()]);
  const [reviewedBy, setReviewedBy] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState("");

  const addMed = () => setMeds((m) => [...m, newMed()]);
  const removeMed = (id: string) =>
    setMeds((m) => m.filter((x) => x.id !== id));
  const updateMed = (id: string, k: keyof MedRow, v: string) =>
    setMeds((m) => m.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  const handleSubmit = () =>
    onSubmit({
      medications: JSON.stringify(meds),
      reviewedBy,
      reconciliationDate,
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Medication Review Date">
          <DateField
            value={reconciliationDate}
            onChange={setReconciliationDate}
          />
        </F>
        <F label="Reviewed / Reconciled By">
          <Input
            placeholder="Dr. Smith"
            value={reviewedBy}
            onChange={(e) => setReviewedBy(e.target.value)}
          />
        </F>
      </div>

      <div className="space-y-3">
        {meds.map((m, idx) => (
          <div
            key={m.id}
            className="rounded-md border border-border p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Medication {idx + 1}
              </p>
              {meds.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMed(m.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <F label="Drug Name (generic preferred)">
                  <Input
                    placeholder="Metformin"
                    value={m.name}
                    onChange={(e) => updateMed(m.id, "name", e.target.value)}
                  />
                </F>
              </div>
              <F label="Status">
                <Sel
                  value={m.status}
                  onValueChange={(v) => updateMed(m.id, "status", v)}
                  placeholder="Status"
                >
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </Sel>
              </F>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <F label="Dose">
                <Input
                  placeholder="500"
                  value={m.dose}
                  onChange={(e) => updateMed(m.id, "dose", e.target.value)}
                />
              </F>
              <F label="Unit">
                <Sel
                  value={m.unit}
                  onValueChange={(v) => updateMed(m.id, "unit", v)}
                  placeholder="Unit"
                >
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="mL">mL</SelectItem>
                  <SelectItem value="IU">IU</SelectItem>
                  <SelectItem value="units">units</SelectItem>
                  <SelectItem value="mmol">mmol</SelectItem>
                </Sel>
              </F>
              <F label="Route">
                <Sel
                  value={m.route}
                  onValueChange={(v) => updateMed(m.id, "route", v)}
                  placeholder="Route"
                >
                  <SelectItem value="oral">Oral (by mouth)</SelectItem>
                  <SelectItem value="iv">Intravenous (IV)</SelectItem>
                  <SelectItem value="im">Intramuscular (IM)</SelectItem>
                  <SelectItem value="sc">Subcutaneous (SC)</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="inhaled">Inhaled</SelectItem>
                  <SelectItem value="transdermal">
                    Transdermal (patch)
                  </SelectItem>
                  <SelectItem value="sublingual">
                    Sublingual (under tongue)
                  </SelectItem>
                  <SelectItem value="rectal">Rectal</SelectItem>
                  <SelectItem value="intranasal">Intranasal</SelectItem>
                  <SelectItem value="ophthalmic">
                    Ophthalmic (eye drops)
                  </SelectItem>
                  <SelectItem value="otic">Otic (ear drops)</SelectItem>
                </Sel>
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Frequency">
                <Sel
                  value={m.frequency}
                  onValueChange={(v) => updateMed(m.id, "frequency", v)}
                  placeholder="How often"
                >
                  <SelectItem value="qd">Once daily (QD)</SelectItem>
                  <SelectItem value="bid">Twice daily (BID)</SelectItem>
                  <SelectItem value="tid">Three times daily (TID)</SelectItem>
                  <SelectItem value="qid">Four times daily (QID)</SelectItem>
                  <SelectItem value="q4h">Every 4 hours (Q4H)</SelectItem>
                  <SelectItem value="q6h">Every 6 hours (Q6H)</SelectItem>
                  <SelectItem value="q8h">Every 8 hours (Q8H)</SelectItem>
                  <SelectItem value="q12h">Every 12 hours (Q12H)</SelectItem>
                  <SelectItem value="prn">As needed (PRN)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </Sel>
              </F>
              <F label="Start Date">
                <DateField
                  value={m.startDate}
                  onChange={(v) => updateMed(m.id, "startDate", v)}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Indication (what it treats)">
                <Input
                  placeholder="Type 2 Diabetes"
                  value={m.indication}
                  onChange={(e) =>
                    updateMed(m.id, "indication", e.target.value)
                  }
                />
              </F>
              <F label="Prescribed By">
                <Input
                  placeholder="Dr. Williams"
                  value={m.prescribedBy}
                  onChange={(e) =>
                    updateMed(m.id, "prescribedBy", e.target.value)
                  }
                />
              </F>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addMed}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" /> Add Another Medication
      </Button>
      <Button onClick={handleSubmit}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 3. Lab Results ───────────────────────────────────────────────────────────
type TestRow = {
  id: string;
  testName: string;
  loincCode: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: string;
};

const newTest = (): TestRow => ({
  id: crypto.randomUUID(),
  testName: "",
  loincCode: "",
  value: "",
  unit: "",
  referenceRange: "",
  flag: "normal",
});

export function LabResultsForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [tests, setTests] = useState<TestRow[]>([newTest()]);
  const [meta, setMeta] = useState({
    orderingPhysician: "",
    lab: "",
    collectionDate: "",
    collectionTime: "",
    fastingStatus: "",
    specimenType: "",
  });
  const um = (k: string, v: string) => setMeta((p) => ({ ...p, [k]: v }));

  const addTest = () => setTests((t) => [...t, newTest()]);
  const removeTest = (id: string) =>
    setTests((t) => t.filter((x) => x.id !== id));
  const updateTest = (id: string, k: keyof TestRow, v: string) =>
    setTests((t) => t.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  const handleSubmit = () =>
    onSubmit({ tests: JSON.stringify(tests), ...meta });

  const flagColors: Record<string, string> = {
    normal: "text-emerald-400",
    high: "text-amber-400",
    low: "text-blue-400",
    "critical-high": "text-red-400",
    "critical-low": "text-red-400",
  };

  return (
    <div className="space-y-4">
      {/* Collection metadata */}
      <div className="rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Collection Information
        </p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Ordering Physician">
            <Input
              placeholder="Dr. Johnson"
              value={meta.orderingPhysician}
              onChange={(e) => um("orderingPhysician", e.target.value)}
            />
          </F>
          <F label="Lab / Facility">
            <Input
              placeholder="Quest Diagnostics"
              value={meta.lab}
              onChange={(e) => um("lab", e.target.value)}
            />
          </F>
          <F label="Collection Date">
            <DateField
              value={meta.collectionDate}
              onChange={(v) => um("collectionDate", v)}
            />
          </F>
          <F label="Collection Time">
            <Input
              type="time"
              value={meta.collectionTime}
              onChange={(e) => um("collectionTime", e.target.value)}
              className="h-9"
            />
          </F>
          <F label="Fasting Status">
            <Sel
              value={meta.fastingStatus}
              onValueChange={(v) => um("fastingStatus", v)}
              placeholder="Select"
            >
              <SelectItem value="fasting">Fasting (&gt;8 hrs)</SelectItem>
              <SelectItem value="non-fasting">Non-fasting</SelectItem>
              <SelectItem value="na">Not applicable</SelectItem>
            </Sel>
          </F>
          <F label="Specimen Type">
            <Sel
              value={meta.specimenType}
              onValueChange={(v) => um("specimenType", v)}
              placeholder="Select specimen"
            >
              <SelectItem value="blood-venous">Blood — Venous</SelectItem>
              <SelectItem value="blood-arterial">
                Blood — Arterial (ABG)
              </SelectItem>
              <SelectItem value="blood-capillary">Blood — Capillary</SelectItem>
              <SelectItem value="urine-spot">Urine — Spot</SelectItem>
              <SelectItem value="urine-24h">
                Urine — 24-hour collection
              </SelectItem>
              <SelectItem value="stool">Stool</SelectItem>
              <SelectItem value="csf">Cerebrospinal Fluid (CSF)</SelectItem>
              <SelectItem value="swab">Swab (throat/wound/cervical)</SelectItem>
              <SelectItem value="tissue">Tissue / Biopsy</SelectItem>
              <SelectItem value="sputum">Sputum</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </Sel>
          </F>
        </div>
      </div>

      {/* Test rows */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Test Results
        </p>
        {tests.map((t, idx) => (
          <div
            key={t.id}
            className="rounded-md border border-border p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Test {idx + 1}
              </p>
              {tests.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTest(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <F label="Test Name (e.g. Hemoglobin, Fasting Glucose)">
                  <Input
                    placeholder="Hemoglobin"
                    value={t.testName}
                    onChange={(e) =>
                      updateTest(t.id, "testName", e.target.value)
                    }
                  />
                </F>
              </div>
              <F label="LOINC Code (optional)">
                <Input
                  placeholder="718-7"
                  value={t.loincCode}
                  onChange={(e) =>
                    updateTest(t.id, "loincCode", e.target.value)
                  }
                />
              </F>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <F label="Result Value">
                <Input
                  placeholder="14.2"
                  value={t.value}
                  onChange={(e) => updateTest(t.id, "value", e.target.value)}
                />
              </F>
              <F label="Unit">
                <Input
                  placeholder="g/dL"
                  value={t.unit}
                  onChange={(e) => updateTest(t.id, "unit", e.target.value)}
                />
              </F>
              <F label="Reference Range">
                <Input
                  placeholder="12.0–16.0"
                  value={t.referenceRange}
                  onChange={(e) =>
                    updateTest(t.id, "referenceRange", e.target.value)
                  }
                />
              </F>
              <F label="Flag">
                <Sel
                  value={t.flag}
                  onValueChange={(v) => updateTest(t.id, "flag", v)}
                  placeholder="Flag"
                >
                  <SelectItem value="normal">
                    <span className={flagColors.normal}>Normal</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className={flagColors.high}>High (H)</span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className={flagColors.low}>Low (L)</span>
                  </SelectItem>
                  <SelectItem value="critical-high">
                    <span className={flagColors["critical-high"]}>
                      Critical High
                    </span>
                  </SelectItem>
                  <SelectItem value="critical-low">
                    <span className={flagColors["critical-low"]}>
                      Critical Low
                    </span>
                  </SelectItem>
                </Sel>
              </F>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addTest}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" /> Add Another Test
      </Button>
      <Button onClick={handleSubmit}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 4. Allergy Profile ───────────────────────────────────────────────────────
export function AllergyProfileForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    allergen: "",
    category: "",
    reactionType: "",
    severity: "",
    verificationStatus: "",
    status: "active",
    onsetDate: "",
    lastOccurrence: "",
    dateRecorded: "",
    emergencyTreatment: "",
    documentedBy: "",
    notes: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Allergen Name">
          <Input
            placeholder="Penicillin"
            value={f.allergen}
            onChange={(e) => u("allergen", e.target.value)}
          />
        </F>
        <F label="Category">
          <Sel
            value={f.category}
            onValueChange={(v) => u("category", v)}
            placeholder="Select type"
          >
            <SelectItem value="drug">Drug / Medication</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="environmental">
              Environmental (pollen, dust, mold)
            </SelectItem>
            <SelectItem value="insect">Insect Venom</SelectItem>
            <SelectItem value="latex">Latex</SelectItem>
            <SelectItem value="contrast">Contrast Media / Dye</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Sel>
        </F>
        <F label="Reaction Type (e.g. Urticaria, Anaphylaxis)">
          <Input
            placeholder="Urticaria, anaphylaxis, rash..."
            value={f.reactionType}
            onChange={(e) => u("reactionType", e.target.value)}
          />
        </F>
        <F label="Severity">
          <Sel
            value={f.severity}
            onValueChange={(v) => u("severity", v)}
            placeholder="Select severity"
          >
            <SelectItem value="mild">
              Mild (localised, self-limiting)
            </SelectItem>
            <SelectItem value="moderate">
              Moderate (systemic but not life-threatening)
            </SelectItem>
            <SelectItem value="severe">
              Severe (hospitalisation required)
            </SelectItem>
            <SelectItem value="life-threatening">
              Life-threatening (anaphylactic shock)
            </SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </Sel>
        </F>
        <F label="Verification Status">
          <Sel
            value={f.verificationStatus}
            onValueChange={(v) => u("verificationStatus", v)}
            placeholder="How certain?"
          >
            <SelectItem value="confirmed">
              Confirmed (allergy testing / documented reaction)
            </SelectItem>
            <SelectItem value="suspected">
              Suspected (reported by patient, unverified)
            </SelectItem>
            <SelectItem value="refuted">
              Refuted (ruled out by testing)
            </SelectItem>
          </Sel>
        </F>
        <F label="Allergy Status">
          <Sel
            value={f.status}
            onValueChange={(v) => u("status", v)}
            placeholder="Status"
          >
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </Sel>
        </F>
        <F label="Onset Date">
          <DateField value={f.onsetDate} onChange={(v) => u("onsetDate", v)} />
        </F>
        <F label="Last Occurrence">
          <DateField
            value={f.lastOccurrence}
            onChange={(v) => u("lastOccurrence", v)}
          />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Emergency Treatment (if applicable)">
          <Input
            placeholder="EpiPen 0.3mg IM, Benadryl..."
            value={f.emergencyTreatment}
            onChange={(e) => u("emergencyTreatment", e.target.value)}
          />
        </F>
        <F label="Documented By">
          <Input
            placeholder="Dr. Chen"
            value={f.documentedBy}
            onChange={(e) => u("documentedBy", e.target.value)}
          />
        </F>
      </div>
      <F label="Additional Notes">
        <Textarea
          placeholder="Tolerance to related compounds, cross-reactive agents, notes..."
          value={f.notes}
          onChange={(e) => u("notes", e.target.value)}
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 5. Vaccination ───────────────────────────────────────────────────────────
export function VaccinationForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    vaccine: "",
    cvxCode: "",
    dateAdministered: "",
    doseInSeries: "",
    totalDoses: "",
    lotNumber: "",
    manufacturer: "",
    route: "",
    site: "",
    administeredBy: "",
    visGiven: "",
    nextDue: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Vaccine Name (common name)">
          <Input
            placeholder="Influenza, COVID-19 bivalent..."
            value={f.vaccine}
            onChange={(e) => u("vaccine", e.target.value)}
          />
        </F>
        <F label="CVX Code (CDC standard, optional)">
          <Input
            placeholder="141"
            value={f.cvxCode}
            onChange={(e) => u("cvxCode", e.target.value)}
          />
        </F>
        <F label="Date Administered">
          <DateField
            value={f.dateAdministered}
            onChange={(v) => u("dateAdministered", v)}
          />
        </F>
        <F label="Dose in Series (e.g. 2 of 3)">
          <div className="flex gap-2">
            <Input
              placeholder="2"
              value={f.doseInSeries}
              onChange={(e) => u("doseInSeries", e.target.value)}
            />
            <span className="flex items-center text-sm text-muted-foreground">
              of
            </span>
            <Input
              placeholder="3"
              value={f.totalDoses}
              onChange={(e) => u("totalDoses", e.target.value)}
            />
          </div>
        </F>
        <F label="Lot Number">
          <Input
            placeholder="EL9261"
            value={f.lotNumber}
            onChange={(e) => u("lotNumber", e.target.value)}
          />
        </F>
        <F label="Manufacturer">
          <Input
            placeholder="Pfizer, Moderna, Sanofi..."
            value={f.manufacturer}
            onChange={(e) => u("manufacturer", e.target.value)}
          />
        </F>
        <F label="Route of Administration">
          <Sel
            value={f.route}
            onValueChange={(v) => u("route", v)}
            placeholder="Select route"
          >
            <SelectItem value="im">Intramuscular (IM)</SelectItem>
            <SelectItem value="sc">Subcutaneous (SC)</SelectItem>
            <SelectItem value="intranasal">Intranasal</SelectItem>
            <SelectItem value="oral">Oral</SelectItem>
            <SelectItem value="id">Intradermal (ID)</SelectItem>
          </Sel>
        </F>
        <F label="Anatomical Site">
          <Sel
            value={f.site}
            onValueChange={(v) => u("site", v)}
            placeholder="Injection site"
          >
            <SelectItem value="left-deltoid">
              Left Deltoid (upper arm)
            </SelectItem>
            <SelectItem value="right-deltoid">
              Right Deltoid (upper arm)
            </SelectItem>
            <SelectItem value="left-thigh">Left Anterolateral Thigh</SelectItem>
            <SelectItem value="right-thigh">
              Right Anterolateral Thigh
            </SelectItem>
            <SelectItem value="left-gluteal">Left Gluteal</SelectItem>
            <SelectItem value="right-gluteal">Right Gluteal</SelectItem>
            <SelectItem value="oral">Oral (not applicable)</SelectItem>
          </Sel>
        </F>
        <F label="Administered By / Facility">
          <Input
            placeholder="Dr. Jones / CVS Pharmacy"
            value={f.administeredBy}
            onChange={(e) => u("administeredBy", e.target.value)}
          />
        </F>
        <F label="VIS (Vaccine Information Statement) Given">
          <Sel
            value={f.visGiven}
            onValueChange={(v) => u("visGiven", v)}
            placeholder="Select"
          >
            <SelectItem value="yes">Yes — provided to patient</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="na">Not applicable</SelectItem>
          </Sel>
        </F>
        <F label="Next Dose Due">
          <DateField value={f.nextDue} onChange={(v) => u("nextDue", v)} />
        </F>
      </div>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 6. Cardiology ───────────────────────────────────────────────────────────
export function CardiologyForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    testType: "",
    date: "",
    cardiologist: "",
    referringPhysician: "",
    indication: "",
    // ECG
    ecgRate: "",
    ecgRhythm: "",
    prInterval: "",
    qrsDuration: "",
    qtcInterval: "",
    ecgAxis: "",
    // Echo
    lvef: "",
    wallMotion: "",
    valveAssessment: "",
    findings: "",
    interpretation: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isEcg = f.testType === "ecg";
  const isEcho = f.testType === "echo";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Test Type">
          <Sel
            value={f.testType}
            onValueChange={(v) => u("testType", v)}
            placeholder="Select test"
          >
            <SelectItem value="ecg">
              ECG / EKG (12-lead electrocardiogram)
            </SelectItem>
            <SelectItem value="echo">
              Echocardiogram (cardiac ultrasound)
            </SelectItem>
            <SelectItem value="stress">
              Stress Test (exercise / pharmacological)
            </SelectItem>
            <SelectItem value="holter">Holter Monitor (24–48h ECG)</SelectItem>
            <SelectItem value="cath">Cardiac Catheterisation</SelectItem>
            <SelectItem value="ct-coronary">CT Coronary Angiography</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Sel>
        </F>
        <F label="Date of Test">
          <DateField value={f.date} onChange={(v) => u("date", v)} />
        </F>
        <F label="Cardiologist">
          <Input
            placeholder="Dr. Patel"
            value={f.cardiologist}
            onChange={(e) => u("cardiologist", e.target.value)}
          />
        </F>
        <F label="Referring Physician">
          <Input
            placeholder="Dr. Adams (GP)"
            value={f.referringPhysician}
            onChange={(e) => u("referringPhysician", e.target.value)}
          />
        </F>
      </div>
      <F label="Indication / Reason for Test">
        <Input
          placeholder="Palpitations, chest pain, routine cardiac evaluation..."
          value={f.indication}
          onChange={(e) => u("indication", e.target.value)}
        />
      </F>

      {isEcg && (
        <div className="rounded-md border border-border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            ECG Parameters
          </p>
          <div className="grid grid-cols-3 gap-3">
            <F label="Rate (bpm)">
              <Input
                placeholder="72"
                value={f.ecgRate}
                onChange={(e) => u("ecgRate", e.target.value)}
              />
            </F>
            <F label="Rhythm">
              <Sel
                value={f.ecgRhythm}
                onValueChange={(v) => u("ecgRhythm", v)}
                placeholder="Rhythm"
              >
                <SelectItem value="sinus">Sinus Rhythm (normal)</SelectItem>
                <SelectItem value="af">Atrial Fibrillation (AF)</SelectItem>
                <SelectItem value="flutter">Atrial Flutter</SelectItem>
                <SelectItem value="svt">
                  SVT (supraventricular tachycardia)
                </SelectItem>
                <SelectItem value="vt">Ventricular Tachycardia (VT)</SelectItem>
                <SelectItem value="heart-block">Heart Block</SelectItem>
                <SelectItem value="paced">Paced Rhythm</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </Sel>
            </F>
            <F label="Axis">
              <Sel
                value={f.ecgAxis}
                onValueChange={(v) => u("ecgAxis", v)}
                placeholder="Axis"
              >
                <SelectItem value="normal">Normal (0° to +90°)</SelectItem>
                <SelectItem value="left">Left Axis Deviation</SelectItem>
                <SelectItem value="right">Right Axis Deviation</SelectItem>
                <SelectItem value="extreme">Extreme Axis Deviation</SelectItem>
              </Sel>
            </F>
            <F label="PR Interval (ms)">
              <Input
                placeholder="160"
                value={f.prInterval}
                onChange={(e) => u("prInterval", e.target.value)}
              />
            </F>
            <F label="QRS Duration (ms)">
              <Input
                placeholder="90"
                value={f.qrsDuration}
                onChange={(e) => u("qrsDuration", e.target.value)}
              />
            </F>
            <F label="QTc Interval (ms)">
              <Input
                placeholder="420"
                value={f.qtcInterval}
                onChange={(e) => u("qtcInterval", e.target.value)}
              />
            </F>
          </div>
        </div>
      )}

      {isEcho && (
        <div className="rounded-md border border-border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Echocardiogram Parameters
          </p>
          <div className="grid grid-cols-3 gap-3">
            <F label="LVEF — Left Ventricular Ejection Fraction (%)">
              <Input
                placeholder="65"
                value={f.lvef}
                onChange={(e) => u("lvef", e.target.value)}
              />
            </F>
            <F label="Wall Motion">
              <Sel
                value={f.wallMotion}
                onValueChange={(v) => u("wallMotion", v)}
                placeholder="Wall motion"
              >
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="hypokinesis">
                  Hypokinesis (reduced)
                </SelectItem>
                <SelectItem value="akinesis">Akinesis (absent)</SelectItem>
                <SelectItem value="dyskinesis">
                  Dyskinesis (paradoxical)
                </SelectItem>
              </Sel>
            </F>
            <F label="Valve Assessment">
              <Input
                placeholder="No significant valvular disease..."
                value={f.valveAssessment}
                onChange={(e) => u("valveAssessment", e.target.value)}
              />
            </F>
          </div>
        </div>
      )}

      <F label="Findings">
        <Textarea
          placeholder="Objective findings from the test..."
          value={f.findings}
          onChange={(e) => u("findings", e.target.value)}
          className="min-h-[80px]"
        />
      </F>
      <F label="Clinical Interpretation">
        <Textarea
          placeholder="Cardiologist interpretation and clinical significance..."
          value={f.interpretation}
          onChange={(e) => u("interpretation", e.target.value)}
          className="min-h-[80px]"
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 7. Surgical Report ───────────────────────────────────────────────────────
export function SurgicalReportForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    procedureName: "",
    cptCode: "",
    dateOfSurgery: "",
    surgeon: "",
    assistantSurgeon: "",
    anesthesiologist: "",
    anesthesiaType: "",
    estimatedBloodLoss: "",
    duration: "",
    complications: "",
    pathologySpecimen: "",
    disposition: "",
    operativeFindings: "",
    postOpPlan: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Procedure Name (surgical procedure performed)">
          <Input
            placeholder="Laparoscopic Appendectomy"
            value={f.procedureName}
            onChange={(e) => u("procedureName", e.target.value)}
          />
        </F>
        <F label="CPT Code (optional)">
          <Input
            placeholder="44950"
            value={f.cptCode}
            onChange={(e) => u("cptCode", e.target.value)}
          />
        </F>
        <F label="Date of Surgery">
          <DateField
            value={f.dateOfSurgery}
            onChange={(v) => u("dateOfSurgery", v)}
          />
        </F>
        <F label="Duration (minutes)">
          <Input
            placeholder="75"
            value={f.duration}
            onChange={(e) => u("duration", e.target.value)}
          />
        </F>
        <F label="Surgeon">
          <Input
            placeholder="Dr. Rodriguez, MD FACS"
            value={f.surgeon}
            onChange={(e) => u("surgeon", e.target.value)}
          />
        </F>
        <F label="Assistant Surgeon">
          <Input
            placeholder="Dr. Kim / not applicable"
            value={f.assistantSurgeon}
            onChange={(e) => u("assistantSurgeon", e.target.value)}
          />
        </F>
        <F label="Anesthesiologist">
          <Input
            placeholder="Dr. Nguyen"
            value={f.anesthesiologist}
            onChange={(e) => u("anesthesiologist", e.target.value)}
          />
        </F>
        <F label="Anesthesia Type">
          <Sel
            value={f.anesthesiaType}
            onValueChange={(v) => u("anesthesiaType", v)}
            placeholder="Select type"
          >
            <SelectItem value="general">
              General (patient fully unconscious)
            </SelectItem>
            <SelectItem value="regional">
              Regional (epidural / spinal / nerve block)
            </SelectItem>
            <SelectItem value="mac">
              MAC — Monitored Anesthesia Care (sedation)
            </SelectItem>
            <SelectItem value="local">
              Local (injection at surgical site only)
            </SelectItem>
            <SelectItem value="neuraxial">
              Neuraxial (spinal or epidural)
            </SelectItem>
          </Sel>
        </F>
        <F label="Estimated Blood Loss — EBL (mL)">
          <Input
            placeholder="50"
            value={f.estimatedBloodLoss}
            onChange={(e) => u("estimatedBloodLoss", e.target.value)}
          />
        </F>
        <F label="Pathology Specimen Sent?">
          <Sel
            value={f.pathologySpecimen}
            onValueChange={(v) => u("pathologySpecimen", v)}
            placeholder="Select"
          >
            <SelectItem value="yes">Yes — sent to pathology</SelectItem>
            <SelectItem value="no">No specimen</SelectItem>
          </Sel>
        </F>
        <F label="Post-op Disposition (where patient went after)">
          <Sel
            value={f.disposition}
            onValueChange={(v) => u("disposition", v)}
            placeholder="Select"
          >
            <SelectItem value="ward">Inpatient Ward</SelectItem>
            <SelectItem value="icu">ICU / Critical Care</SelectItem>
            <SelectItem value="pacu">PACU — Recovery Room</SelectItem>
            <SelectItem value="day-surgery">
              Day Surgery (same-day discharge)
            </SelectItem>
            <SelectItem value="ambulatory">Ambulatory / Outpatient</SelectItem>
          </Sel>
        </F>
        <F label="Complications">
          <Input
            placeholder="None / Describe if any..."
            value={f.complications}
            onChange={(e) => u("complications", e.target.value)}
          />
        </F>
      </div>
      <F label="Operative Findings">
        <Textarea
          placeholder="Intraoperative observations, anatomical findings, specimen description..."
          value={f.operativeFindings}
          onChange={(e) => u("operativeFindings", e.target.value)}
          className="min-h-[80px]"
        />
      </F>
      <F label="Post-op Plan & Instructions">
        <Textarea
          placeholder="Diet, activity restrictions, wound care, follow-up appointments..."
          value={f.postOpPlan}
          onChange={(e) => u("postOpPlan", e.target.value)}
          className="min-h-[80px]"
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 8. Discharge Summary ─────────────────────────────────────────────────────
export function DischargeSummaryForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    admissionDate: "",
    dischargeDate: "",
    admissionType: "",
    principalDiagnosis: "",
    icd10Code: "",
    secondaryDiagnoses: "",
    attendingPhysician: "",
    dischargeCondition: "",
    dischargeDisposition: "",
    medicationsOnDischarge: "",
    followUpInstructions: "",
    restrictions: "",
    returnToErInstructions: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Admission Date">
          <DateField
            value={f.admissionDate}
            onChange={(v) => u("admissionDate", v)}
          />
        </F>
        <F label="Discharge Date">
          <DateField
            value={f.dischargeDate}
            onChange={(v) => u("dischargeDate", v)}
          />
        </F>
        <F label="Admission Type">
          <Sel
            value={f.admissionType}
            onValueChange={(v) => u("admissionType", v)}
            placeholder="How admitted?"
          >
            <SelectItem value="emergency">Emergency (unplanned)</SelectItem>
            <SelectItem value="elective">Elective (planned)</SelectItem>
            <SelectItem value="urgent">Urgent (within 24–48h)</SelectItem>
            <SelectItem value="transfer">
              Transfer from another facility
            </SelectItem>
          </Sel>
        </F>
        <F label="Attending Physician">
          <Input
            placeholder="Dr. Williams, MD"
            value={f.attendingPhysician}
            onChange={(e) => u("attendingPhysician", e.target.value)}
          />
        </F>
        <F label="Principal Diagnosis (main reason for admission)">
          <Input
            placeholder="Acute Appendicitis"
            value={f.principalDiagnosis}
            onChange={(e) => u("principalDiagnosis", e.target.value)}
          />
        </F>
        <F label="ICD-10 Code (principal diagnosis)">
          <Input
            placeholder="K35.80"
            value={f.icd10Code}
            onChange={(e) => u("icd10Code", e.target.value)}
          />
        </F>
        <F label="Discharge Condition">
          <Sel
            value={f.dischargeCondition}
            onValueChange={(v) => u("dischargeCondition", v)}
            placeholder="Patient condition at discharge"
          >
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="stable">Stable</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </Sel>
        </F>
        <F label="Discharge Disposition (where patient went)">
          <Sel
            value={f.dischargeDisposition}
            onValueChange={(v) => u("dischargeDisposition", v)}
            placeholder="Destination"
          >
            <SelectItem value="home">Home</SelectItem>
            <SelectItem value="home-health">
              Home with Home Health Services
            </SelectItem>
            <SelectItem value="snf">Skilled Nursing Facility (SNF)</SelectItem>
            <SelectItem value="rehab">Inpatient Rehabilitation</SelectItem>
            <SelectItem value="ltc">Long-term Care Facility</SelectItem>
            <SelectItem value="hospital">
              Transfer to Another Hospital
            </SelectItem>
            <SelectItem value="hospice">Hospice / Palliative Care</SelectItem>
            <SelectItem value="ama">
              Left AMA (Against Medical Advice)
            </SelectItem>
          </Sel>
        </F>
      </div>
      <F label="Secondary Diagnoses (comorbidities addressed during admission)">
        <Textarea
          placeholder="Hypertension, Type 2 Diabetes, Post-op wound infection..."
          value={f.secondaryDiagnoses}
          onChange={(e) => u("secondaryDiagnoses", e.target.value)}
        />
      </F>
      <F label="Medications on Discharge">
        <Textarea
          placeholder="Amoxicillin 500mg PO TID × 7 days, Ibuprofen 400mg PO PRN pain..."
          value={f.medicationsOnDischarge}
          onChange={(e) => u("medicationsOnDischarge", e.target.value)}
        />
      </F>
      <F label="Follow-up Instructions">
        <Textarea
          placeholder="Follow up with surgeon in 2 weeks, labs in 1 week..."
          value={f.followUpInstructions}
          onChange={(e) => u("followUpInstructions", e.target.value)}
        />
      </F>
      <F label="Activity & Dietary Restrictions">
        <Textarea
          placeholder="No lifting > 5kg for 6 weeks, light diet for 48h..."
          value={f.restrictions}
          onChange={(e) => u("restrictions", e.target.value)}
        />
      </F>
      <F label="Return to ER If...">
        <Textarea
          placeholder="Fever > 38.5°C, severe abdominal pain, wound dehiscence..."
          value={f.returnToErInstructions}
          onChange={(e) => u("returnToErInstructions", e.target.value)}
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 9. Mental Health ─────────────────────────────────────────────────────────
export function MentalHealthForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    sessionType: "",
    sessionDate: "",
    clinician: "",
    dsm5Diagnosis: "",
    dsm5Code: "",
    phq9Score: "",
    gad7Score: "",
    cssrs: "",
    safetyPlan: "",
    treatmentModality: "",
    clinicalNotes: "",
    treatmentPlanUpdate: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Session Type">
          <Sel
            value={f.sessionType}
            onValueChange={(v) => u("sessionType", v)}
            placeholder="Select type"
          >
            <SelectItem value="individual">Individual Therapy</SelectItem>
            <SelectItem value="group">Group Therapy</SelectItem>
            <SelectItem value="family">Family / Couples Therapy</SelectItem>
            <SelectItem value="med-management">
              Medication Management
            </SelectItem>
            <SelectItem value="psychiatric-eval">
              Psychiatric Evaluation
            </SelectItem>
            <SelectItem value="crisis">Crisis Intervention</SelectItem>
          </Sel>
        </F>
        <F label="Session Date">
          <DateField
            value={f.sessionDate}
            onChange={(v) => u("sessionDate", v)}
          />
        </F>
        <F label="Clinician (Psychiatrist / Therapist)">
          <Input
            placeholder="Dr. Torres, MD / Jane Smith, LCSW"
            value={f.clinician}
            onChange={(e) => u("clinician", e.target.value)}
          />
        </F>
        <F label="Treatment Approach (Modality)">
          <Sel
            value={f.treatmentModality}
            onValueChange={(v) => u("treatmentModality", v)}
            placeholder="Select modality"
          >
            <SelectItem value="cbt">
              CBT — Cognitive Behavioural Therapy
            </SelectItem>
            <SelectItem value="dbt">
              DBT — Dialectical Behaviour Therapy
            </SelectItem>
            <SelectItem value="emdr">
              EMDR — Eye Movement Desensitization
            </SelectItem>
            <SelectItem value="psychodynamic">Psychodynamic Therapy</SelectItem>
            <SelectItem value="act">
              ACT — Acceptance & Commitment Therapy
            </SelectItem>
            <SelectItem value="medication">
              Medication Management Only
            </SelectItem>
            <SelectItem value="supportive">Supportive Therapy</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Sel>
        </F>
        <F label="DSM-5 Diagnosis">
          <Input
            placeholder="Major Depressive Disorder, recurrent, moderate"
            value={f.dsm5Diagnosis}
            onChange={(e) => u("dsm5Diagnosis", e.target.value)}
          />
        </F>
        <F label="DSM-5 Code (ICD-10 equivalent)">
          <Input
            placeholder="F33.1"
            value={f.dsm5Code}
            onChange={(e) => u("dsm5Code", e.target.value)}
          />
        </F>
      </div>

      {/* Validated scales */}
      <div className="rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Validated Clinical Scales
        </p>
        <div className="grid grid-cols-3 gap-3">
          <F label="PHQ-9 Score (depression, 0–27)">
            <Sel
              value={f.phq9Score}
              onValueChange={(v) => u("phq9Score", v)}
              placeholder="Score"
            >
              {[
                "Not assessed",
                "0–4 (Minimal)",
                "5–9 (Mild)",
                "10–14 (Moderate)",
                "15–19 (Moderately severe)",
                "20–27 (Severe)",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </Sel>
          </F>
          <F label="GAD-7 Score (anxiety, 0–21)">
            <Sel
              value={f.gad7Score}
              onValueChange={(v) => u("gad7Score", v)}
              placeholder="Score"
            >
              {[
                "Not assessed",
                "0–4 (Minimal)",
                "5–9 (Mild)",
                "10–14 (Moderate)",
                "15–21 (Severe)",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </Sel>
          </F>
          <F label="C-SSRS (Suicidality Screening)">
            <Sel
              value={f.cssrs}
              onValueChange={(v) => u("cssrs", v)}
              placeholder="Result"
            >
              <SelectItem value="negative">Negative (no ideation)</SelectItem>
              <SelectItem value="passive-ideation">Passive Ideation</SelectItem>
              <SelectItem value="active-ideation">
                Active Ideation (no plan)
              </SelectItem>
              <SelectItem value="active-plan">
                Active Ideation with Plan
              </SelectItem>
              <SelectItem value="not-assessed">
                Not assessed this session
              </SelectItem>
            </Sel>
          </F>
        </div>
      </div>

      <F label="Safety Plan in Place?">
        <Sel
          value={f.safetyPlan}
          onValueChange={(v) => u("safetyPlan", v)}
          placeholder="Select"
        >
          <SelectItem value="yes">
            Yes — active safety plan documented
          </SelectItem>
          <SelectItem value="no">No — not indicated</SelectItem>
          <SelectItem value="updated">Yes — updated this session</SelectItem>
        </Sel>
      </F>
      <F label="Clinical Session Notes">
        <Textarea
          placeholder="Subjective report, affect, mental status, themes discussed..."
          value={f.clinicalNotes}
          onChange={(e) => u("clinicalNotes", e.target.value)}
          className="min-h-[100px]"
        />
      </F>
      <F label="Treatment Plan Update">
        <Textarea
          placeholder="Goals for next session, medication changes, referrals..."
          value={f.treatmentPlanUpdate}
          onChange={(e) => u("treatmentPlanUpdate", e.target.value)}
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── 10. Medical History ──────────────────────────────────────────────────────
export function MedHistoryForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState({
    conditions: "",
    surgeries: "",
    familyHistory: "",
    allergies: "",
    socialHistory: "",
    reproductiveHistory: "",
    notes: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <F label="Current & Past Medical Conditions (include ICD-10 if known)">
        <Textarea
          placeholder="Hypertension (I10), Type 2 Diabetes (E11), Asthma (J45)..."
          value={f.conditions}
          onChange={(e) => u("conditions", e.target.value)}
        />
      </F>
      <F label="Previous Surgeries & Procedures (include year and facility)">
        <Textarea
          placeholder="Appendectomy 2019 (Mayo Clinic), Cholecystectomy 2022..."
          value={f.surgeries}
          onChange={(e) => u("surgeries", e.target.value)}
        />
      </F>
      <F label="Family Medical History (include relationship)">
        <Textarea
          placeholder="Father: Coronary artery disease (died age 62); Mother: Type 2 Diabetes, Breast cancer..."
          value={f.familyHistory}
          onChange={(e) => u("familyHistory", e.target.value)}
        />
      </F>
      <F label="Known Allergies (drug, food, environmental)">
        <Input
          placeholder="Penicillin (anaphylaxis), Shellfish (urticaria)..."
          value={f.allergies}
          onChange={(e) => u("allergies", e.target.value)}
        />
      </F>
      <F label="Social History (smoking, alcohol, substances, occupation)">
        <Textarea
          placeholder="Ex-smoker (quit 2018, 10 pack-year history), social alcohol use, office worker..."
          value={f.socialHistory}
          onChange={(e) => u("socialHistory", e.target.value)}
        />
      </F>
      <F label="Reproductive / Obstetric History (if applicable)">
        <Textarea
          placeholder="G3P2A1, LMP 2026-01-15, contraception: OCP..."
          value={f.reproductiveHistory}
          onChange={(e) => u("reproductiveHistory", e.target.value)}
        />
      </F>
      <F label="Additional Notes">
        <Textarea
          placeholder="Any other relevant history..."
          value={f.notes}
          onChange={(e) => u("notes", e.target.value)}
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

// ─── Generic + Upload ─────────────────────────────────────────────────────────
export const genericContentLabel: Record<string, string> = {
  "imaging-report": "Imaging Findings & Radiologist Impression",
  "pathology-report": "Pathologist Findings & Histological Report",
  "physical-therapy": "PT Session Notes, ROM Measurements & Exercise Plan",
  "dental-record": "Dental Procedure, ADA Tooth Chart Notes & X-ray Findings",
  "vision-exam":
    "Visual Acuity (OD/OS), Refraction Prescription & Exam Findings",
  "referral-letter": "Referral Reason, Clinical Summary & Specialist Requested",
  "emergency-record":
    "Chief Complaint, Triage Category, Interventions & Disposition",
  "nutrition-assessment":
    "Dietary Assessment, Anthropometric Data & Nutritional Care Plan",
  "genetic-report":
    "Gene Variant, ACMG Classification & Clinical Interpretation",
};

export function GenericMedicalForm({
  templateId,
  onSubmit,
}: {
  templateId: string;
  onSubmit: SubmitFn;
}) {
  const [f, setF] = useState({
    date: "",
    provider: "",
    content: "",
    notes: "",
  });
  const u = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const contentLabel = genericContentLabel[templateId] ?? "Clinical Notes";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Date">
          <DateField value={f.date} onChange={(v) => u("date", v)} />
        </F>
        <F label="Provider / Facility">
          <Input
            placeholder="Dr. Smith / Mayo Clinic"
            value={f.provider}
            onChange={(e) => u("provider", e.target.value)}
          />
        </F>
      </div>
      <F label={contentLabel}>
        <Textarea
          className="min-h-[120px]"
          placeholder="Enter details..."
          value={f.content}
          onChange={(e) => u("content", e.target.value)}
        />
      </F>
      <F label="Additional Notes">
        <Textarea
          placeholder="Any other relevant information..."
          value={f.notes}
          onChange={(e) => u("notes", e.target.value)}
        />
      </F>
      <Button onClick={() => onSubmit(f)}>Encrypt & Upload via CRE</Button>
    </div>
  );
}

export function UploadForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-4">
      <F label="Document Label">
        <Input
          placeholder="e.g. Annual Checkup Report 2024"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </F>
      <F label="File (PDF, JPG, PNG)">
        <div
          className={`rounded-lg border-2 border-dashed transition-colors p-8 text-center ${file ? "border-primary/40 bg-primary/5" : "border-border hover:border-border/60"}`}
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            id="doc-upload"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            {file ? (
              <p className="text-sm font-medium">
                {file.name}{" "}
                <span className="text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload</p>
              </div>
            )}
          </label>
        </div>
      </F>
      <F label="Notes">
        <Textarea
          placeholder="Any additional context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </F>
      <Button
        onClick={() => onSubmit({ label, fileName: file?.name ?? "", notes })}
        disabled={!file}
      >
        Encrypt & Upload via CRE
      </Button>
    </div>
  );
}
