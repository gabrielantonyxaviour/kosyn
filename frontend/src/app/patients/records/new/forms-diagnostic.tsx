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
  imagingPresets,
  pathologyPresets,
  geneticPresets,
} from "./presets";

// ─── 1. ImagingReportForm ─────────────────────────────────────────────────────
export function ImagingReportForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState(pickRandom(imagingPresets));

  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

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
        <F label="Modality">
          <Sel
            value={f.modality}
            onValueChange={set("modality")}
            placeholder="Select modality"
          >
            <SelectItem value="X-ray">X-ray</SelectItem>
            <SelectItem value="CT">CT</SelectItem>
            <SelectItem value="MRI">MRI</SelectItem>
            <SelectItem value="Ultrasound">Ultrasound</SelectItem>
            <SelectItem value="PET">PET</SelectItem>
            <SelectItem value="Mammography">Mammography</SelectItem>
          </Sel>
        </F>
        <F label="Body Part">
          <Input
            className="h-9 text-sm"
            value={f.bodyPart}
            onChange={(e) => set("bodyPart")(e.target.value)}
            placeholder="e.g. Chest"
          />
        </F>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Indication">
          <Input
            className="h-9 text-sm"
            value={f.indication}
            onChange={(e) => set("indication")(e.target.value)}
            placeholder="Clinical indication"
          />
        </F>
        <F label="Contrast Used">
          <Sel
            value={f.contrastUsed}
            onValueChange={set("contrastUsed")}
            placeholder="Select contrast"
          >
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="IV">IV</SelectItem>
            <SelectItem value="Oral">Oral</SelectItem>
            <SelectItem value="Both">Both</SelectItem>
          </Sel>
        </F>
        <F label="Radiologist">
          <Input
            className="h-9 text-sm"
            value={f.radiologist}
            onChange={(e) => set("radiologist")(e.target.value)}
            placeholder="Radiologist name"
          />
        </F>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Facility">
          <Input
            className="h-9 text-sm"
            value={f.facility}
            onChange={(e) => set("facility")(e.target.value)}
            placeholder="Imaging center / hospital"
          />
        </F>
        <F label="Accession Number">
          <Input
            className="h-9 text-sm"
            value={f.accessionNumber}
            onChange={(e) => set("accessionNumber")(e.target.value)}
            placeholder="Accession #"
          />
        </F>
      </div>

      {/* Full-width fields */}
      <F label="Findings">
        <Textarea
          rows={4}
          className="text-sm resize-none"
          value={f.findings}
          onChange={(e) => set("findings")(e.target.value)}
          placeholder="Detailed imaging findings"
        />
      </F>
      <F label="Impression">
        <Textarea
          rows={3}
          className="text-sm resize-none"
          value={f.impression}
          onChange={(e) => set("impression")(e.target.value)}
          placeholder="Radiologist's impression / conclusion"
        />
      </F>
      <F label="Comparison">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.comparison}
          onChange={(e) => set("comparison")(e.target.value)}
          placeholder="Comparison with prior studies"
        />
      </F>
      <F label="Recommendations">
        <Input
          className="h-9 text-sm"
          value={f.recommendations}
          onChange={(e) => set("recommendations")(e.target.value)}
          placeholder="Follow-up recommendations"
        />
      </F>
      <F label="Notes">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Additional notes"
        />
      </F>

      <Button type="submit" className="w-full">
        Save Imaging Report
      </Button>
    </form>
  );
}

// ─── 2. PathologyReportForm ───────────────────────────────────────────────────
export function PathologyReportForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState(pickRandom(pathologyPresets));

  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

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
        <F label="Specimen Date">
          <DateField value={f.specimenDate} onChange={set("specimenDate")} />
        </F>
        <F label="Report Date">
          <DateField value={f.reportDate} onChange={set("reportDate")} />
        </F>
        <F label="Specimen Type">
          <Sel
            value={f.specimenType}
            onValueChange={set("specimenType")}
            placeholder="Select type"
          >
            <SelectItem value="Biopsy">Biopsy</SelectItem>
            <SelectItem value="FNA">FNA</SelectItem>
            <SelectItem value="Cytology">Cytology</SelectItem>
            <SelectItem value="Resection">Resection</SelectItem>
            <SelectItem value="Excision">Excision</SelectItem>
          </Sel>
        </F>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Specimen Site">
          <Input
            className="h-9 text-sm"
            value={f.specimenSite}
            onChange={(e) => set("specimenSite")(e.target.value)}
            placeholder="Anatomical site"
          />
        </F>
        <F label="Pathologist">
          <Input
            className="h-9 text-sm"
            value={f.pathologist}
            onChange={(e) => set("pathologist")(e.target.value)}
            placeholder="Pathologist name"
          />
        </F>
        <F label="Grade">
          <Input
            className="h-9 text-sm"
            value={f.grade}
            onChange={(e) => set("grade")(e.target.value)}
            placeholder="e.g. Grade 2"
          />
        </F>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Margins">
          <Sel
            value={f.margins}
            onValueChange={set("margins")}
            placeholder="Select margins"
          >
            <SelectItem value="Negative">Negative</SelectItem>
            <SelectItem value="Positive">Positive</SelectItem>
            <SelectItem value="Close">Close</SelectItem>
            <SelectItem value="Not Applicable">Not Applicable</SelectItem>
          </Sel>
        </F>
        <F label="Stage">
          <Input
            className="h-9 text-sm"
            value={f.stage}
            onChange={(e) => set("stage")(e.target.value)}
            placeholder="e.g. pT2N0M0"
          />
        </F>
        <F label="Special Stains">
          <Input
            className="h-9 text-sm"
            value={f.specialStains}
            onChange={(e) => set("specialStains")(e.target.value)}
            placeholder="e.g. ER+, PR-, HER2-"
          />
        </F>
      </div>

      {/* Full-width fields */}
      <F label="Clinical History">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.clinicalHistory}
          onChange={(e) => set("clinicalHistory")(e.target.value)}
          placeholder="Relevant clinical history"
        />
      </F>
      <F label="Gross Description">
        <Textarea
          rows={3}
          className="text-sm resize-none"
          value={f.grossDescription}
          onChange={(e) => set("grossDescription")(e.target.value)}
          placeholder="Macroscopic / gross description of specimen"
        />
      </F>
      <F label="Microscopic Findings">
        <Textarea
          rows={3}
          className="text-sm resize-none"
          value={f.microscopicFindings}
          onChange={(e) => set("microscopicFindings")(e.target.value)}
          placeholder="Histological / microscopic findings"
        />
      </F>
      <F label="Diagnosis">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.diagnosis}
          onChange={(e) => set("diagnosis")(e.target.value)}
          placeholder="Pathological diagnosis"
        />
      </F>
      <F label="Notes">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Additional notes"
        />
      </F>

      <Button type="submit" className="w-full">
        Save Pathology Report
      </Button>
    </form>
  );
}

// ─── 3. GeneticReportForm ─────────────────────────────────────────────────────
export function GeneticReportForm({ onSubmit }: { onSubmit: SubmitFn }) {
  const [f, setF] = useState(pickRandom(geneticPresets));

  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

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
        <F label="Test Date">
          <DateField value={f.testDate} onChange={set("testDate")} />
        </F>
        <F label="Test Type">
          <Sel
            value={f.testType}
            onValueChange={set("testType")}
            placeholder="Select test type"
          >
            <SelectItem value="Whole Genome Sequencing">
              Whole Genome Sequencing
            </SelectItem>
            <SelectItem value="Whole Exome Sequencing">
              Whole Exome Sequencing
            </SelectItem>
            <SelectItem value="Gene Panel">Gene Panel</SelectItem>
            <SelectItem value="Single Gene">Single Gene</SelectItem>
            <SelectItem value="FISH">FISH</SelectItem>
            <SelectItem value="Karyotype">Karyotype</SelectItem>
            <SelectItem value="Microarray">Microarray</SelectItem>
          </Sel>
        </F>
        <F label="Lab">
          <Input
            className="h-9 text-sm"
            value={f.lab}
            onChange={(e) => set("lab")(e.target.value)}
            placeholder="Laboratory name"
          />
        </F>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Gene Name">
          <Input
            className="h-9 text-sm"
            value={f.geneName}
            onChange={(e) => set("geneName")(e.target.value)}
            placeholder="e.g. BRCA1"
          />
        </F>
        <F label="Variant">
          <Input
            className="h-9 text-sm"
            value={f.variant}
            onChange={(e) => set("variant")(e.target.value)}
            placeholder="e.g. c.1234A>G p.Glu412Gly"
          />
        </F>
        <F label="Zygosity">
          <Sel
            value={f.zygosity}
            onValueChange={set("zygosity")}
            placeholder="Select zygosity"
          >
            <SelectItem value="Heterozygous">Heterozygous</SelectItem>
            <SelectItem value="Homozygous">Homozygous</SelectItem>
            <SelectItem value="Hemizygous">Hemizygous</SelectItem>
            <SelectItem value="Compound Heterozygous">
              Compound Heterozygous
            </SelectItem>
          </Sel>
        </F>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="ACMG Classification">
          <Sel
            value={f.acmgClassification}
            onValueChange={set("acmgClassification")}
            placeholder="Select classification"
          >
            <SelectItem value="Pathogenic">Pathogenic</SelectItem>
            <SelectItem value="Likely Pathogenic">Likely Pathogenic</SelectItem>
            <SelectItem value="Variant of Uncertain Significance">
              Variant of Uncertain Significance
            </SelectItem>
            <SelectItem value="Likely Benign">Likely Benign</SelectItem>
            <SelectItem value="Benign">Benign</SelectItem>
          </Sel>
        </F>
        <F label="Inheritance Pattern">
          <Sel
            value={f.inheritancePattern}
            onValueChange={set("inheritancePattern")}
            placeholder="Select pattern"
          >
            <SelectItem value="Autosomal Dominant">
              Autosomal Dominant
            </SelectItem>
            <SelectItem value="Autosomal Recessive">
              Autosomal Recessive
            </SelectItem>
            <SelectItem value="X-linked Dominant">X-linked Dominant</SelectItem>
            <SelectItem value="X-linked Recessive">
              X-linked Recessive
            </SelectItem>
            <SelectItem value="Mitochondrial">Mitochondrial</SelectItem>
            <SelectItem value="Unknown">Unknown</SelectItem>
          </Sel>
        </F>
        <F label="Associated Condition">
          <Input
            className="h-9 text-sm"
            value={f.associatedCondition}
            onChange={(e) => set("associatedCondition")(e.target.value)}
            placeholder="e.g. Hereditary Breast Cancer"
          />
        </F>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Ordering Provider">
          <Input
            className="h-9 text-sm"
            value={f.orderingProvider}
            onChange={(e) => set("orderingProvider")(e.target.value)}
            placeholder="Ordering physician name"
          />
        </F>
      </div>

      {/* Full-width fields */}
      <F label="Clinical Interpretation">
        <Textarea
          rows={3}
          className="text-sm resize-none"
          value={f.clinicalInterpretation}
          onChange={(e) => set("clinicalInterpretation")(e.target.value)}
          placeholder="Clinical significance and interpretation of findings"
        />
      </F>
      <F label="Recommendations">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.recommendations}
          onChange={(e) => set("recommendations")(e.target.value)}
          placeholder="Clinical recommendations based on findings"
        />
      </F>
      <F label="Family Implications">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.familyImplications}
          onChange={(e) => set("familyImplications")(e.target.value)}
          placeholder="Implications for family members / cascade testing"
        />
      </F>
      <F label="Notes">
        <Textarea
          rows={2}
          className="text-sm resize-none"
          value={f.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Additional notes"
        />
      </F>

      <Button type="submit" className="w-full">
        Save Genetic Report
      </Button>
    </form>
  );
}
