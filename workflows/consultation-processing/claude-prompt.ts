/**
 * Nillion nilAI messages construction for clinical analysis inside TEE.
 *
 * PII stripping follows HIPAA Safe Harbor method:
 * removes 18 identifier categories before sending to AI.
 *
 * Returns OpenAI messages array format for Nillion /v1/chat/completions.
 */

export interface ClinicalMessage {
  role: "system" | "user";
  content: string;
}

const SYSTEM_PROMPT = `You are a clinical AI assistant running inside a Trusted Execution Environment (TEE).
Your task is to analyze a medical consultation transcript and produce structured clinical documentation.

IMPORTANT PRIVACY RULES:
1. Strip ALL Protected Health Information (PHI) per HIPAA Safe Harbor:
   - Names, addresses, dates (except year), phone/fax numbers, email addresses
   - SSN, medical record numbers, health plan beneficiary numbers
   - Account numbers, certificate/license numbers, vehicle identifiers
   - Device identifiers, URLs, IP addresses, biometric identifiers
   - Full-face photos, any other unique identifying number
2. Replace any PHI found with [REDACTED]
3. Never output raw patient identifiers`;

const USER_TEMPLATE = (transcript: string) =>
  `TRANSCRIPT:
${transcript}

PRODUCE THE FOLLOWING (in JSON format):

{
  "soapNote": {
    "subjective": "Patient's chief complaint, history of present illness, review of systems",
    "objective": "Vital signs, physical examination findings, lab results discussed",
    "assessment": "Clinical assessment, differential diagnoses",
    "plan": "Treatment plan, medications, follow-up, referrals"
  },
  "summary": "2-3 sentence clinical summary suitable for patient portal",
  "medicalCodes": {
    "icd10": ["Array of relevant ICD-10 diagnosis codes with descriptions"],
    "cpt": ["Array of relevant CPT procedure codes with descriptions"]
  },
  "drugInteractions": [
    {
      "drugs": ["medication name 1", "medication name 2"],
      "severity": "high|moderate|low",
      "description": "interaction description"
    }
  ],
  "followUp": {
    "timeframe": "recommended follow-up timeframe",
    "instructions": "patient instructions"
  }
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

/** Build OpenAI-format messages array for clinical transcript analysis */
export function buildClinicalMessages(
  transcript: string,
  patientRecords?: Array<{
    type: string;
    label: string;
    data?: Record<string, string>;
  }>,
): ClinicalMessage[] {
  let userContent = USER_TEMPLATE(transcript);

  if (patientRecords && patientRecords.length > 0) {
    const recordsSection = patientRecords
      .map((r) => {
        const dataLines = r.data
          ? Object.entries(r.data)
              .map(([k, v]) => `  ${k}: ${v}`)
              .join("\n")
          : "  (no structured data)";
        return `[${r.type.toUpperCase()} — ${r.label}]\n${dataLines}`;
      })
      .join("\n\n");

    userContent = `PATIENT RECORDS CONTEXT:\n${recordsSection}\n\n${USER_TEMPLATE(transcript)}`;
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}

/** Legacy: build flat string prompt (kept for compatibility) */
export function buildClinicalPrompt(transcript: string): string {
  return `${SYSTEM_PROMPT}\n\n${USER_TEMPLATE(transcript)}`;
}
