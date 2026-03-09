"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectItem } from "@/components/ui/select";
import { F, DateField, Sel, type SubmitFn } from "./forms";
import {
  pickRandom,
  visionPresets,
  dentalPresets,
  physicalTherapyPresets,
  nutritionPresets,
} from "./presets";

// ─── VisionExamForm ────────────────────────────────────────────────────────────

export function VisionExamForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(pickRandom(visionPresets));

  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Exam Date">
          <DateField value={f.examDate} onChange={set("examDate")} />
        </F>
        <F label="Exam Type">
          <Sel
            value={f.examType}
            onValueChange={set("examType")}
            placeholder="Select type"
          >
            <SelectItem value="comprehensive">Comprehensive</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="contact-lens">Contact Lens</SelectItem>
            <SelectItem value="pre-op">Pre-op</SelectItem>
            <SelectItem value="post-op">Post-op</SelectItem>
          </Sel>
        </F>
        <F label="Examiner">
          <Input value={f.examiner} onChange={inp("examiner")} />
        </F>
      </div>

      {/* Visual Acuity */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Visual Acuity
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="OD Uncorrected">
          <Input
            value={f.vaOdUncorrected}
            onChange={inp("vaOdUncorrected")}
            placeholder="e.g. 20/20"
          />
        </F>
        <F label="OS Uncorrected">
          <Input
            value={f.vaOsUncorrected}
            onChange={inp("vaOsUncorrected")}
            placeholder="e.g. 20/20"
          />
        </F>
        <F label="OD Corrected">
          <Input
            value={f.vaOdCorrected}
            onChange={inp("vaOdCorrected")}
            placeholder="e.g. 20/20"
          />
        </F>
        <F label="OS Corrected">
          <Input
            value={f.vaOsCorrected}
            onChange={inp("vaOsCorrected")}
            placeholder="e.g. 20/20"
          />
        </F>
      </div>

      {/* Refraction */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Refraction
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Sphere OD">
          <Input
            value={f.sphereOd}
            onChange={inp("sphereOd")}
            placeholder="+/-0.00"
          />
        </F>
        <F label="Sphere OS">
          <Input
            value={f.sphereOs}
            onChange={inp("sphereOs")}
            placeholder="+/-0.00"
          />
        </F>
        <F label="Cylinder OD">
          <Input
            value={f.cylinderOd}
            onChange={inp("cylinderOd")}
            placeholder="-0.00"
          />
        </F>
        <F label="Cylinder OS">
          <Input
            value={f.cylinderOs}
            onChange={inp("cylinderOs")}
            placeholder="-0.00"
          />
        </F>
        <F label="Axis OD">
          <Input
            value={f.axisOd}
            onChange={inp("axisOd")}
            placeholder="0-180°"
          />
        </F>
        <F label="Axis OS">
          <Input
            value={f.axisOs}
            onChange={inp("axisOs")}
            placeholder="0-180°"
          />
        </F>
        <F label="Add Power">
          <Input value={f.addPower} onChange={inp("addPower")} />
        </F>
        <F label="PD">
          <Input value={f.pd} onChange={inp("pd")} placeholder="mm" />
        </F>
      </div>

      {/* Clinical */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Clinical
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="IOP OD">
          <Input value={f.iopOd} onChange={inp("iopOd")} placeholder="mmHg" />
        </F>
        <F label="IOP OS">
          <Input value={f.iopOs} onChange={inp("iopOs")} placeholder="mmHg" />
        </F>
        <F label="Anterior Segment">
          <Textarea
            value={f.anteriorSegment}
            onChange={inp("anteriorSegment")}
            rows={2}
          />
        </F>
        <F label="Posterior Segment">
          <Textarea
            value={f.posteriorSegment}
            onChange={inp("posteriorSegment")}
            rows={2}
          />
        </F>
      </div>

      {/* Diagnosis & Plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Diagnosis">
          <Input value={f.diagnosis} onChange={inp("diagnosis")} />
        </F>
        <F label="Plan">
          <Textarea value={f.plan} onChange={inp("plan")} rows={2} />
        </F>
      </div>

      <F label="Notes">
        <Textarea value={f.notes} onChange={inp("notes")} rows={2} />
      </F>

      <Button type="submit" className="w-full">
        Save Vision Exam
      </Button>
    </form>
  );
}

// ─── DentalRecordForm ──────────────────────────────────────────────────────────

export function DentalRecordForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(pickRandom(dentalPresets));

  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Visit Date">
          <DateField value={f.visitDate} onChange={set("visitDate")} />
        </F>
        <F label="Visit Type">
          <Sel
            value={f.visitType}
            onValueChange={set("visitType")}
            placeholder="Select type"
          >
            <SelectItem value="routine-cleaning">Routine Cleaning</SelectItem>
            <SelectItem value="examination">Examination</SelectItem>
            <SelectItem value="filling">Filling</SelectItem>
            <SelectItem value="extraction">Extraction</SelectItem>
            <SelectItem value="root-canal">Root Canal</SelectItem>
            <SelectItem value="crown">Crown</SelectItem>
            <SelectItem value="orthodontic">Orthodontic</SelectItem>
            <SelectItem value="periodontal">Periodontal</SelectItem>
            <SelectItem value="implant">Implant</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </Sel>
        </F>
        <F label="Dentist">
          <Input value={f.dentist} onChange={inp("dentist")} />
        </F>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Facility">
          <Input value={f.facility} onChange={inp("facility")} />
        </F>
        <F label="CDT Code">
          <Input
            value={f.cdtCode}
            onChange={inp("cdtCode")}
            placeholder="e.g. D0120"
          />
        </F>
        <F label="Anesthesia">
          <Sel
            value={f.anesthesia}
            onValueChange={set("anesthesia")}
            placeholder="Select"
          >
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="topical">Topical</SelectItem>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="nitrous-oxide">Nitrous Oxide</SelectItem>
            <SelectItem value="iv-sedation">IV Sedation</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </Sel>
        </F>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Tooth Numbers">
          <Input
            value={f.toothNumbers}
            onChange={inp("toothNumbers")}
            placeholder="e.g. 1,2,14 (ADA universal)"
          />
        </F>
        <F label="Procedure Description">
          <Input
            value={f.procedureDescription}
            onChange={inp("procedureDescription")}
          />
        </F>
      </div>

      <F label="Periodontal Status">
        <Input
          value={f.periodontalStatus}
          onChange={inp("periodontalStatus")}
        />
      </F>

      <F label="X-Ray Findings">
        <Textarea
          value={f.xrayFindings}
          onChange={inp("xrayFindings")}
          rows={2}
        />
      </F>

      <F label="Materials Used">
        <Input value={f.materialsUsed} onChange={inp("materialsUsed")} />
      </F>

      <F label="Oral Hygiene Status">
        <Sel
          value={f.oralHygieneStatus}
          onValueChange={set("oralHygieneStatus")}
          placeholder="Select status"
        >
          <SelectItem value="excellent">Excellent</SelectItem>
          <SelectItem value="good">Good</SelectItem>
          <SelectItem value="fair">Fair</SelectItem>
          <SelectItem value="poor">Poor</SelectItem>
        </Sel>
      </F>

      <F label="Treatment Plan">
        <Textarea
          value={f.treatmentPlan}
          onChange={inp("treatmentPlan")}
          rows={2}
        />
      </F>

      <F label="Next Appointment">
        <DateField
          value={f.nextAppointment}
          onChange={set("nextAppointment")}
        />
      </F>

      <F label="Notes">
        <Textarea value={f.notes} onChange={inp("notes")} rows={2} />
      </F>

      <Button type="submit" className="w-full">
        Save Dental Record
      </Button>
    </form>
  );
}

// ─── PhysicalTherapyForm ───────────────────────────────────────────────────────

export function PhysicalTherapyForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(
    pickRandom(physicalTherapyPresets),
  );

  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Session Date">
          <DateField value={f.sessionDate} onChange={set("sessionDate")} />
        </F>
        <F label="Session Number">
          <Input
            value={f.sessionNumber}
            onChange={inp("sessionNumber")}
            placeholder="e.g. 5"
          />
        </F>
        <F label="Therapist">
          <Input value={f.therapist} onChange={inp("therapist")} />
        </F>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Referring Physician">
          <Input
            value={f.referringPhysician}
            onChange={inp("referringPhysician")}
          />
        </F>
        <F label="Diagnosis">
          <Input value={f.diagnosis} onChange={inp("diagnosis")} />
        </F>
        <F label="ICD-10 Code">
          <Input
            value={f.icd10Code}
            onChange={inp("icd10Code")}
            placeholder="e.g. M54.5"
          />
        </F>
      </div>

      <F label="Chief Complaint">
        <Input value={f.chiefComplaint} onChange={inp("chiefComplaint")} />
      </F>

      {/* Assessment */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Assessment
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Pain Level">
          <Input
            value={f.painLevel}
            onChange={inp("painLevel")}
            placeholder="NRS 0-10"
          />
        </F>
        <F label="Functional Status">
          <Sel
            value={f.functionalStatus}
            onValueChange={set("functionalStatus")}
            placeholder="Select status"
          >
            <SelectItem value="independent">Independent</SelectItem>
            <SelectItem value="supervision">Supervision</SelectItem>
            <SelectItem value="minimal-assist">Minimal Assist</SelectItem>
            <SelectItem value="moderate-assist">Moderate Assist</SelectItem>
            <SelectItem value="maximal-assist">Maximal Assist</SelectItem>
            <SelectItem value="dependent">Dependent</SelectItem>
          </Sel>
        </F>
        <F label="ROM Measurements">
          <Textarea
            value={f.romMeasurements}
            onChange={inp("romMeasurements")}
            rows={2}
          />
        </F>
        <F label="Strength Testing">
          <Textarea
            value={f.strengthTesting}
            onChange={inp("strengthTesting")}
            rows={2}
          />
        </F>
      </div>

      {/* Treatment */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Treatment
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Interventions">
          <Textarea
            value={f.interventions}
            onChange={inp("interventions")}
            rows={2}
          />
        </F>
        <F label="Exercise Plan">
          <Textarea
            value={f.exercisePlan}
            onChange={inp("exercisePlan")}
            rows={2}
          />
        </F>
      </div>

      <F label="Modalities">
        <Input
          value={f.modalities}
          onChange={inp("modalities")}
          placeholder="e.g. TENS, ultrasound, hot pack"
        />
      </F>

      <F label="Progress Notes">
        <Textarea
          value={f.progressNotes}
          onChange={inp("progressNotes")}
          rows={3}
        />
      </F>

      <F label="Goals Update">
        <Textarea
          value={f.goalsUpdate}
          onChange={inp("goalsUpdate")}
          rows={2}
        />
      </F>

      <F label="Plan for Next Session">
        <Textarea
          value={f.planNextSession}
          onChange={inp("planNextSession")}
          rows={2}
        />
      </F>

      <F label="Notes">
        <Textarea value={f.notes} onChange={inp("notes")} rows={2} />
      </F>

      <Button type="submit" className="w-full">
        Save PT Session
      </Button>
    </form>
  );
}

// ─── NutritionAssessmentForm ───────────────────────────────────────────────────

export function NutritionAssessmentForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(
    pickRandom(nutritionPresets),
  );

  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Assessment Date">
          <DateField
            value={f.assessmentDate}
            onChange={set("assessmentDate")}
          />
        </F>
        <F label="Dietitian">
          <Input value={f.dietitian} onChange={inp("dietitian")} />
        </F>
        <F label="Referral Reason">
          <Input value={f.referralReason} onChange={inp("referralReason")} />
        </F>
      </div>

      {/* Anthropometric */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Anthropometric
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Height">
          <Input value={f.height} onChange={inp("height")} placeholder="cm" />
        </F>
        <F label="Weight">
          <Input value={f.weight} onChange={inp("weight")} placeholder="kg" />
        </F>
        <F label="BMI">
          <Input value={f.bmi} onChange={inp("bmi")} placeholder="auto-calc" />
        </F>
        <F label="Waist Circumference">
          <Input value={f.waist} onChange={inp("waist")} placeholder="cm" />
        </F>
        <F label="Body Fat">
          <Input value={f.bodyFat} onChange={inp("bodyFat")} placeholder="%" />
        </F>
      </div>

      {/* Nutritional Screening */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Nutritional Screening
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Nutritional Status">
          <Sel
            value={f.nutritionalStatus}
            onValueChange={set("nutritionalStatus")}
            placeholder="Select status"
          >
            <SelectItem value="well-nourished">Well Nourished</SelectItem>
            <SelectItem value="at-risk">At Risk</SelectItem>
            <SelectItem value="malnourished">Malnourished</SelectItem>
          </Sel>
        </F>
        <F label="Screening Tool">
          <Sel
            value={f.screeningTool}
            onValueChange={set("screeningTool")}
            placeholder="Select tool"
          >
            <SelectItem value="must">MUST</SelectItem>
            <SelectItem value="mna">MNA</SelectItem>
            <SelectItem value="sga">SGA</SelectItem>
            <SelectItem value="nrs-2002">NRS-2002</SelectItem>
            <SelectItem value="mst">MST</SelectItem>
          </Sel>
        </F>
        <F label="Screening Score">
          <Input value={f.screeningScore} onChange={inp("screeningScore")} />
        </F>
      </div>

      <F label="Dietary History">
        <Textarea
          value={f.dietaryHistory}
          onChange={inp("dietaryHistory")}
          rows={3}
        />
      </F>

      <F label="Food Allergies">
        <Input value={f.foodAllergies} onChange={inp("foodAllergies")} />
      </F>

      <F label="Supplements">
        <Textarea
          value={f.supplements}
          onChange={inp("supplements")}
          rows={2}
        />
      </F>

      <F label="Lab Values">
        <Textarea value={f.labValues} onChange={inp("labValues")} rows={2} />
      </F>

      <F label="Diagnosis">
        <Input value={f.diagnosis} onChange={inp("diagnosis")} />
      </F>

      <F label="Goals">
        <Textarea value={f.goals} onChange={inp("goals")} rows={2} />
      </F>

      <F label="Care Plan">
        <Textarea value={f.carePlan} onChange={inp("carePlan")} rows={3} />
      </F>

      <F label="Follow-Up">
        <Input value={f.followUp} onChange={inp("followUp")} />
      </F>

      <F label="Notes">
        <Textarea value={f.notes} onChange={inp("notes")} rows={2} />
      </F>

      <Button type="submit" className="w-full">
        Save Nutrition Assessment
      </Button>
    </form>
  );
}
