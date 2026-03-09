"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectItem } from "@/components/ui/select";
import { F, DateField, TimeField, Sel, type SubmitFn } from "./forms";
import { pickRandom, emergencyPresets, referralPresets } from "./presets";

// ─── EmergencyRecordForm ───────────────────────────────────────────────────────
export function EmergencyRecordForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(
    pickRandom(emergencyPresets),
  );

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1: arrivalDate, arrivalTime, arrivalMode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Arrival Date">
          <DateField
            value={f.arrivalDate}
            onChange={(v) => set("arrivalDate", v)}
          />
        </F>
        <F label="Arrival Time">
          <TimeField
            value={f.arrivalTime}
            onChange={(v) => set("arrivalTime", v)}
          />
        </F>
        <F label="Arrival Mode">
          <Sel
            value={f.arrivalMode}
            onValueChange={(v) => set("arrivalMode", v)}
            placeholder="Select mode"
          >
            <SelectItem value="Walk-in">Walk-in</SelectItem>
            <SelectItem value="Ambulance">Ambulance</SelectItem>
            <SelectItem value="Air Transport">Air Transport</SelectItem>
            <SelectItem value="Police">Police</SelectItem>
            <SelectItem value="Transfer">Transfer</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </Sel>
        </F>
      </div>

      {/* Row 2: chiefComplaint, triageCategory, triageNurse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Chief Complaint">
          <Input
            value={f.chiefComplaint}
            onChange={(e) => set("chiefComplaint", e.target.value)}
          />
        </F>
        <F label="Triage Category">
          <Sel
            value={f.triageCategory}
            onValueChange={(v) => set("triageCategory", v)}
            placeholder="Select ESI level"
          >
            <SelectItem value="ESI 1 - Resuscitation">
              ESI 1 - Resuscitation
            </SelectItem>
            <SelectItem value="ESI 2 - Emergent">ESI 2 - Emergent</SelectItem>
            <SelectItem value="ESI 3 - Urgent">ESI 3 - Urgent</SelectItem>
            <SelectItem value="ESI 4 - Less Urgent">
              ESI 4 - Less Urgent
            </SelectItem>
            <SelectItem value="ESI 5 - Non-urgent">
              ESI 5 - Non-urgent
            </SelectItem>
          </Sel>
        </F>
        <F label="Triage Nurse">
          <Input
            value={f.triageNurse}
            onChange={(e) => set("triageNurse", e.target.value)}
          />
        </F>
      </div>

      {/* Section: Triage Vitals */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
        Triage Vitals
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <F label="BP Systolic">
          <Input
            placeholder="mmHg"
            value={f.bpSystolic}
            onChange={(e) => set("bpSystolic", e.target.value)}
          />
        </F>
        <F label="BP Diastolic">
          <Input
            placeholder="mmHg"
            value={f.bpDiastolic}
            onChange={(e) => set("bpDiastolic", e.target.value)}
          />
        </F>
        <F label="Heart Rate">
          <Input
            placeholder="bpm"
            value={f.heartRate}
            onChange={(e) => set("heartRate", e.target.value)}
          />
        </F>
        <F label="Respiratory Rate">
          <Input
            placeholder="/min"
            value={f.respiratoryRate}
            onChange={(e) => set("respiratoryRate", e.target.value)}
          />
        </F>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Temperature">
          <Input
            placeholder="°C"
            value={f.temperature}
            onChange={(e) => set("temperature", e.target.value)}
          />
        </F>
        <F label="SpO2">
          <Input
            placeholder="%"
            value={f.spo2}
            onChange={(e) => set("spo2", e.target.value)}
          />
        </F>
        <F label="GCS">
          <Input
            placeholder="3-15"
            value={f.gcs}
            onChange={(e) => set("gcs", e.target.value)}
          />
        </F>
      </div>

      {/* Attending Physician */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Attending Physician">
          <Input
            value={f.attendingPhysician}
            onChange={(e) => set("attendingPhysician", e.target.value)}
          />
        </F>
      </div>

      {/* Full-width text areas */}
      <F label="History of Present Illness (HPI)">
        <Textarea
          rows={3}
          value={f.hpi}
          onChange={(e) => set("hpi", e.target.value)}
        />
      </F>
      <F label="Physical Exam">
        <Textarea
          rows={3}
          value={f.physicalExam}
          onChange={(e) => set("physicalExam", e.target.value)}
        />
      </F>
      <F label="Diagnostic Tests">
        <Textarea
          rows={2}
          value={f.diagnosticTests}
          onChange={(e) => set("diagnosticTests", e.target.value)}
        />
      </F>
      <F label="Interventions">
        <Textarea
          rows={2}
          value={f.interventions}
          onChange={(e) => set("interventions", e.target.value)}
        />
      </F>

      {/* ED Diagnosis + ICD-10 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="ED Diagnosis">
          <Input
            value={f.edDiagnosis}
            onChange={(e) => set("edDiagnosis", e.target.value)}
          />
        </F>
        <F label="ICD-10 Code">
          <Input
            placeholder="e.g. S09.90XA"
            value={f.icd10Code}
            onChange={(e) => set("icd10Code", e.target.value)}
          />
        </F>
      </div>

      {/* Disposition */}
      <F label="Disposition">
        <Sel
          value={f.disposition}
          onValueChange={(v) => set("disposition", v)}
          placeholder="Select disposition"
        >
          <SelectItem value="Discharged Home">Discharged Home</SelectItem>
          <SelectItem value="Admitted to Ward">Admitted to Ward</SelectItem>
          <SelectItem value="Admitted to ICU">Admitted to ICU</SelectItem>
          <SelectItem value="Transferred">Transferred</SelectItem>
          <SelectItem value="Left AMA">Left AMA</SelectItem>
          <SelectItem value="Expired">Expired</SelectItem>
        </Sel>
      </F>

      {/* Discharge Instructions + Notes */}
      <F label="Discharge Instructions">
        <Textarea
          rows={2}
          value={f.dischargeInstructions}
          onChange={(e) => set("dischargeInstructions", e.target.value)}
        />
      </F>
      <F label="Notes">
        <Textarea
          rows={2}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </F>

      <Button type="submit" className="w-full">
        Save ED Record
      </Button>
    </form>
  );
}

// ─── ReferralLetterForm ────────────────────────────────────────────────────────
export function ReferralLetterForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState<Record<string, string>>(
    pickRandom(referralPresets),
  );

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Row 1: referralDate, urgency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Referral Date">
          <DateField
            value={f.referralDate}
            onChange={(v) => set("referralDate", v)}
          />
        </F>
        <F label="Urgency">
          <Sel
            value={f.urgency}
            onValueChange={(v) => set("urgency", v)}
            placeholder="Select urgency"
          >
            <SelectItem value="Routine">Routine</SelectItem>
            <SelectItem value="Soon (2-4 weeks)">Soon (2-4 weeks)</SelectItem>
            <SelectItem value="Urgent (within 1 week)">
              Urgent (within 1 week)
            </SelectItem>
            <SelectItem value="Emergent (same day)">
              Emergent (same day)
            </SelectItem>
          </Sel>
        </F>
      </div>

      {/* Row 2: referringProvider, referringFacility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Referring Provider">
          <Input
            value={f.referringProvider}
            onChange={(e) => set("referringProvider", e.target.value)}
          />
        </F>
        <F label="Referring Facility">
          <Input
            value={f.referringFacility}
            onChange={(e) => set("referringFacility", e.target.value)}
          />
        </F>
      </div>

      {/* Row 3: specialtyRequested, specificProvider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Specialty Requested">
          <Sel
            value={f.specialtyRequested}
            onValueChange={(v) => set("specialtyRequested", v)}
            placeholder="Select specialty"
          >
            <SelectItem value="Allergy & Immunology">
              Allergy &amp; Immunology
            </SelectItem>
            <SelectItem value="Cardiology">Cardiology</SelectItem>
            <SelectItem value="Dermatology">Dermatology</SelectItem>
            <SelectItem value="Endocrinology">Endocrinology</SelectItem>
            <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
            <SelectItem value="Hematology">Hematology</SelectItem>
            <SelectItem value="Infectious Disease">
              Infectious Disease
            </SelectItem>
            <SelectItem value="Nephrology">Nephrology</SelectItem>
            <SelectItem value="Neurology">Neurology</SelectItem>
            <SelectItem value="Neurosurgery">Neurosurgery</SelectItem>
            <SelectItem value="Obstetrics & Gynecology">
              Obstetrics &amp; Gynecology
            </SelectItem>
            <SelectItem value="Oncology">Oncology</SelectItem>
            <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
            <SelectItem value="Orthopedic Surgery">
              Orthopedic Surgery
            </SelectItem>
            <SelectItem value="Otolaryngology">Otolaryngology</SelectItem>
            <SelectItem value="Plastic Surgery">Plastic Surgery</SelectItem>
            <SelectItem value="Psychiatry">Psychiatry</SelectItem>
            <SelectItem value="Pulmonology">Pulmonology</SelectItem>
            <SelectItem value="Rheumatology">Rheumatology</SelectItem>
            <SelectItem value="Urology">Urology</SelectItem>
            <SelectItem value="Vascular Surgery">Vascular Surgery</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </Sel>
        </F>
        <F label="Specific Provider">
          <Input
            value={f.specificProvider}
            onChange={(e) => set("specificProvider", e.target.value)}
          />
        </F>
      </div>

      {/* Insurance Auth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Insurance Authorization">
          <Input
            placeholder="Authorization number"
            value={f.insuranceAuth}
            onChange={(e) => set("insuranceAuth", e.target.value)}
          />
        </F>
      </div>

      {/* Full-width fields */}
      <F label="Referral Reason">
        <Input
          value={f.referralReason}
          onChange={(e) => set("referralReason", e.target.value)}
        />
      </F>
      <F label="Clinical Summary">
        <Textarea
          rows={3}
          value={f.clinicalSummary}
          onChange={(e) => set("clinicalSummary", e.target.value)}
        />
      </F>
      <F label="Relevant Diagnosis">
        <Input
          value={f.relevantDiagnosis}
          onChange={(e) => set("relevantDiagnosis", e.target.value)}
        />
      </F>
      <F label="ICD-10 Code">
        <Input
          placeholder="e.g. I10"
          value={f.icd10Code}
          onChange={(e) => set("icd10Code", e.target.value)}
        />
      </F>
      <F label="Relevant Tests / Results">
        <Textarea
          rows={2}
          value={f.relevantTests}
          onChange={(e) => set("relevantTests", e.target.value)}
        />
      </F>
      <F label="Questions for Specialist">
        <Textarea
          rows={2}
          value={f.questionsForSpecialist}
          onChange={(e) => set("questionsForSpecialist", e.target.value)}
        />
      </F>
      <F label="Notes">
        <Textarea
          rows={2}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </F>

      <Button type="submit" className="w-full">
        Save Referral Letter
      </Button>
    </form>
  );
}
