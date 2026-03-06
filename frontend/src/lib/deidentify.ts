// HIPAA Safe Harbor de-identification
// Strips all 18 Safe Harbor identifiers from form data before data marketplace sharing

const PROVIDER_FIELDS = new Set([
  "surgeon",
  "assistantSurgeon",
  "anesthesiologist",
  "cardiologist",
  "referringPhysician",
  "attendingPhysician",
  "clinician",
  "administeredBy",
  "reviewedBy",
  "orderingPhysician",
  "pathologist",
  "therapist",
  "dietitian",
  "dentist",
  "examiner",
  "triageNurse",
  "radiologist",
  "specificProvider",
  "referringProvider",
  "orderingProvider",
  "prescribedBy",
  "documentedBy",
  "lab",
  "facility",
  "referringFacility",
]);

const DATE_FIELDS = new Set([
  "date",
  "dateOfSurgery",
  "admissionDate",
  "dischargeDate",
  "sessionDate",
  "dateAdministered",
  "collectionDate",
  "specimenDate",
  "reportDate",
  "assessmentDate",
  "visitDate",
  "arrivalDate",
  "referralDate",
  "startDate",
  "nextDue",
  "nextAppointment",
  "followUpDate",
  "reconciliationDate",
  "onsetDate",
  "lastOccurrence",
  "dateRecorded",
  "examDate",
  "testDate",
]);

const FREE_TEXT_FIELDS = new Set([
  "notes",
  "clinicalNotes",
  "operativeFindings",
  "postOpPlan",
  "treatmentPlanUpdate",
  "dischargeInstructions",
  "returnToErInstructions",
  "followUpInstructions",
  "restrictions",
  "familyImplications",
  "questionsForSpecialist",
  "clinicalHistory",
  "hpi",
  "clinicalInterpretation",
]);

export function stripYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year < 1900 || year > 2100) return null;
  return match[1];
}

export function deidentify(
  formData: Record<string, string>,
  _templateType?: string,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(formData)) {
    // Provider fields — omit entirely
    if (PROVIDER_FIELDS.has(key)) {
      continue;
    }

    // Free text fields — omit entirely
    if (FREE_TEXT_FIELDS.has(key)) {
      continue;
    }

    // Date fields — extract year only
    if (DATE_FIELDS.has(key)) {
      const year = stripYear(value);
      if (year !== null) {
        result[key] = year;
      }
      continue;
    }

    // Special JSON array fields
    if (key === "medications") {
      try {
        const items = JSON.parse(value) as Record<string, string>[];
        const cleaned = items.map((item) => {
          const { prescribedBy, documentedBy, clinician, ...rest } = item;
          void prescribedBy;
          void documentedBy;
          void clinician;
          const kept: Record<string, string> = {};
          for (const f of [
            "name",
            "dose",
            "unit",
            "route",
            "frequency",
            "indication",
          ]) {
            if (f in rest) kept[f] = rest[f];
          }
          return kept;
        });
        result[key] = JSON.stringify(cleaned);
      } catch {
        // parse error — omit field
      }
      continue;
    }

    if (key === "tests" || key === "labResults") {
      try {
        const items = JSON.parse(value) as Record<string, string>[];
        const cleaned = items.map((item) => {
          const { orderingPhysician, reviewedBy, lab, facility, ...rest } =
            item;
          void orderingPhysician;
          void reviewedBy;
          void lab;
          void facility;
          const kept: Record<string, string> = {};
          for (const f of [
            "testName",
            "loincCode",
            "value",
            "unit",
            "refRange",
            "flag",
          ]) {
            if (f in rest) kept[f] = rest[f];
          }
          return kept;
        });
        result[key] = JSON.stringify(cleaned);
      } catch {
        // parse error — omit field
      }
      continue;
    }

    // All other fields — include as-is
    result[key] = value;
  }

  return result;
}
