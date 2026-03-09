/**
 * Random preset data for all record forms.
 * Each form type has 3 presets — one is randomly selected on mount.
 */

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Vitals ──────────────────────────────────────────────────────────────────
export const vitalsPresets = [
  {
    date: "2026-03-07",
    time: "09:30",
    bpSystolic: "118",
    bpDiastolic: "76",
    bpArm: "right",
    position: "sitting",
    heartRate: "72",
    respiratoryRate: "16",
    height: "170",
    weight: "68",
    temperature: "36.6",
    tempMethod: "oral",
    spo2: "98",
    painScore: "0",
    notes: "Routine annual checkup. All vitals within normal limits.",
  },
  {
    date: "2026-02-14",
    time: "14:15",
    bpSystolic: "132",
    bpDiastolic: "84",
    bpArm: "left",
    position: "sitting",
    heartRate: "88",
    respiratoryRate: "18",
    height: "165",
    weight: "82",
    temperature: "37.1",
    tempMethod: "axillary",
    spo2: "97",
    painScore: "3",
    notes:
      "Slightly elevated BP. Patient reports mild headache. Advised low-sodium diet and follow-up in 2 weeks.",
  },
  {
    date: "2026-01-20",
    time: "08:00",
    bpSystolic: "110",
    bpDiastolic: "70",
    bpArm: "right",
    position: "supine",
    heartRate: "64",
    respiratoryRate: "14",
    height: "178",
    weight: "74",
    temperature: "36.4",
    tempMethod: "oral",
    spo2: "99",
    painScore: "1",
    notes:
      "Post-exercise checkup. Patient is an active runner. Excellent cardiovascular fitness.",
  },
];

// ─── Medical History ─────────────────────────────────────────────────────────
export const medHistoryPresets = [
  {
    conditions:
      "Type 2 Diabetes Mellitus (E11.9) — diagnosed 2019, managed with metformin\nHypertension (I10) — diagnosed 2020, on lisinopril 10mg",
    surgeries: "Appendectomy (2015), Wisdom teeth extraction (2012)",
    familyHistory:
      "Father: MI at age 58, Type 2 DM\nMother: Breast cancer (remission), Osteoporosis\nSibling: Asthma",
    allergies: "Penicillin (rash), Sulfa drugs (anaphylaxis)",
    socialHistory:
      "Non-smoker. Social alcohol (2-3 drinks/week). Exercises 3x/week. Works as software engineer (sedentary). Married, 2 children.",
    reproductiveHistory: "G2P2, last delivery 2022 (vaginal, uncomplicated)",
    notes: "Patient is compliant with medications. Last HbA1c was 6.8%.",
  },
  {
    conditions:
      "Asthma (J45.20) — mild intermittent, uses albuterol PRN\nGERD (K21.0) — managed with omeprazole\nAnxiety disorder (F41.1) — on sertraline 50mg",
    surgeries: "Tonsillectomy (2008), ACL reconstruction right knee (2021)",
    familyHistory:
      "Father: Hypertension, alive\nMother: Thyroid disease, Type 2 DM\nNo family history of cancer",
    allergies: "Shellfish (GI upset), Latex (contact dermatitis)",
    socialHistory:
      "Former smoker (quit 2020, 5 pack-year history). No alcohol. Vegetarian diet. Yoga 4x/week. Teacher.",
    reproductiveHistory: "N/A",
    notes:
      "Asthma well-controlled. No ER visits in past 12 months. Anxiety managed with combination of medication and therapy.",
  },
  {
    conditions:
      "Hypothyroidism (E03.9) — on levothyroxine 75mcg\nMigraine without aura (G43.009) — sumatriptan PRN\nOsteopenia (M85.80) — vitamin D + calcium supplementation",
    surgeries: "Cesarean section (2018), Cholecystectomy (2023)",
    familyHistory:
      "Mother: Osteoporosis, Hypothyroidism\nFather: Coronary artery disease at 62\nMaternal grandmother: Alzheimer's disease",
    allergies: "Codeine (nausea/vomiting), Iodine contrast (mild hives)",
    socialHistory:
      "Never smoker. Occasional wine (1-2/week). Daily walking 30 min. Accountant. Single parent, 1 child.",
    reproductiveHistory: "G1P1, cesarean delivery 2018. Currently on IUD.",
    notes:
      "TSH levels stable on current dose. Migraines occur 2-3x/month, mostly menstrual-related.",
  },
];

// ─── Medications ─────────────────────────────────────────────────────────────
export const medicationsPresets = [
  {
    medications: JSON.stringify([
      {
        id: "1",
        name: "Metformin",
        dose: "500",
        unit: "mg",
        route: "oral",
        frequency: "BID",
        status: "active",
        startDate: "2023-06-15",
        indication: "Type 2 Diabetes",
        prescribedBy: "Dr. Sarah Chen",
      },
      {
        id: "2",
        name: "Lisinopril",
        dose: "10",
        unit: "mg",
        route: "oral",
        frequency: "QD",
        status: "active",
        startDate: "2023-01-10",
        indication: "Hypertension",
        prescribedBy: "Dr. Sarah Chen",
      },
    ]),
    reviewedBy: "Dr. Sarah Chen",
    reconciliationDate: "2026-03-01",
  },
  {
    medications: JSON.stringify([
      {
        id: "1",
        name: "Sertraline",
        dose: "50",
        unit: "mg",
        route: "oral",
        frequency: "QD",
        status: "active",
        startDate: "2025-09-01",
        indication: "Generalized Anxiety Disorder",
        prescribedBy: "Dr. James Patel",
      },
      {
        id: "2",
        name: "Omeprazole",
        dose: "20",
        unit: "mg",
        route: "oral",
        frequency: "QD",
        status: "active",
        startDate: "2024-11-20",
        indication: "GERD",
        prescribedBy: "Dr. Lisa Wong",
      },
      {
        id: "3",
        name: "Albuterol",
        dose: "90",
        unit: "mcg",
        route: "inhaled",
        frequency: "PRN",
        status: "active",
        startDate: "2022-03-15",
        indication: "Asthma",
        prescribedBy: "Dr. Lisa Wong",
      },
    ]),
    reviewedBy: "Dr. Lisa Wong",
    reconciliationDate: "2026-02-20",
  },
  {
    medications: JSON.stringify([
      {
        id: "1",
        name: "Levothyroxine",
        dose: "75",
        unit: "mcg",
        route: "oral",
        frequency: "QD",
        status: "active",
        startDate: "2021-04-10",
        indication: "Hypothyroidism",
        prescribedBy: "Dr. Anil Gupta",
      },
      {
        id: "2",
        name: "Sumatriptan",
        dose: "50",
        unit: "mg",
        route: "oral",
        frequency: "PRN",
        status: "active",
        startDate: "2024-01-05",
        indication: "Migraine",
        prescribedBy: "Dr. Anil Gupta",
      },
    ]),
    reviewedBy: "Dr. Anil Gupta",
    reconciliationDate: "2026-01-15",
  },
];

// ─── Lab Results ─────────────────────────────────────────────────────────────
export const labResultsPresets = [
  {
    tests: JSON.stringify([
      {
        id: "1",
        testName: "HbA1c",
        loincCode: "4548-4",
        value: "6.8",
        unit: "%",
        referenceRange: "4.0-5.6",
        flag: "high",
      },
      {
        id: "2",
        testName: "Fasting Glucose",
        loincCode: "1558-6",
        value: "126",
        unit: "mg/dL",
        referenceRange: "70-100",
        flag: "high",
      },
      {
        id: "3",
        testName: "Total Cholesterol",
        loincCode: "2093-3",
        value: "195",
        unit: "mg/dL",
        referenceRange: "<200",
        flag: "normal",
      },
    ]),
    orderingPhysician: "Dr. Sarah Chen",
    lab: "LabCorp Central",
    collectionDate: "2026-03-05",
    collectionTime: "07:30",
    fastingStatus: "fasting",
    specimenType: "blood",
  },
  {
    tests: JSON.stringify([
      {
        id: "1",
        testName: "TSH",
        loincCode: "3016-3",
        value: "2.4",
        unit: "mIU/L",
        referenceRange: "0.4-4.0",
        flag: "normal",
      },
      {
        id: "2",
        testName: "Free T4",
        loincCode: "3024-7",
        value: "1.1",
        unit: "ng/dL",
        referenceRange: "0.8-1.8",
        flag: "normal",
      },
      {
        id: "3",
        testName: "Vitamin D",
        loincCode: "1989-3",
        value: "28",
        unit: "ng/mL",
        referenceRange: "30-100",
        flag: "low",
      },
    ]),
    orderingPhysician: "Dr. Anil Gupta",
    lab: "Quest Diagnostics",
    collectionDate: "2026-02-28",
    collectionTime: "08:00",
    fastingStatus: "non-fasting",
    specimenType: "blood",
  },
  {
    tests: JSON.stringify([
      {
        id: "1",
        testName: "CBC - WBC",
        loincCode: "6690-2",
        value: "7.2",
        unit: "x10^3/uL",
        referenceRange: "4.5-11.0",
        flag: "normal",
      },
      {
        id: "2",
        testName: "CBC - Hemoglobin",
        loincCode: "718-7",
        value: "13.8",
        unit: "g/dL",
        referenceRange: "12.0-16.0",
        flag: "normal",
      },
      {
        id: "3",
        testName: "Creatinine",
        loincCode: "2160-0",
        value: "0.9",
        unit: "mg/dL",
        referenceRange: "0.6-1.2",
        flag: "normal",
      },
    ]),
    orderingPhysician: "Dr. James Patel",
    lab: "City General Hospital Lab",
    collectionDate: "2026-01-10",
    collectionTime: "09:15",
    fastingStatus: "fasting",
    specimenType: "blood",
  },
];

// ─── Vaccination ─────────────────────────────────────────────────────────────
export const vaccinationPresets = [
  {
    vaccine: "Influenza (Quadrivalent)",
    cvxCode: "197",
    dateAdministered: "2026-01-15",
    doseInSeries: "1",
    totalDoses: "1",
    lotNumber: "FL2026-A442",
    manufacturer: "Sanofi Pasteur",
    route: "IM",
    site: "Left deltoid",
    administeredBy: "RN Maria Lopez",
    visGiven: "yes",
    nextDue: "2027-01-15",
  },
  {
    vaccine: "COVID-19 mRNA Booster (Updated)",
    cvxCode: "229",
    dateAdministered: "2025-11-20",
    doseInSeries: "4",
    totalDoses: "4",
    lotNumber: "CV-MOD-887X",
    manufacturer: "Moderna",
    route: "IM",
    site: "Right deltoid",
    administeredBy: "Pharmacist David Kim",
    visGiven: "yes",
    nextDue: "2026-11-20",
  },
  {
    vaccine: "Tdap (Tetanus, Diphtheria, Pertussis)",
    cvxCode: "115",
    dateAdministered: "2025-06-10",
    doseInSeries: "1",
    totalDoses: "1",
    lotNumber: "TD-GSK-0455",
    manufacturer: "GlaxoSmithKline",
    route: "IM",
    site: "Left deltoid",
    administeredBy: "Dr. Sarah Chen",
    visGiven: "yes",
    nextDue: "2035-06-10",
  },
];

// ─── Cardiology ──────────────────────────────────────────────────────────────
export const cardiologyPresets = [
  {
    testType: "ecg",
    date: "2026-02-28",
    cardiologist: "Dr. Robert Kim",
    referringPhysician: "Dr. Sarah Chen",
    indication: "Palpitations and occasional dizziness",
    ecgRate: "78",
    ecgRhythm: "Normal sinus rhythm",
    prInterval: "160",
    qrsDuration: "88",
    qtcInterval: "420",
    ecgAxis: "Normal axis (60°)",
    lvef: "",
    wallMotion: "",
    valveAssessment: "",
    findings:
      "Normal sinus rhythm. No ST-T wave changes. No arrhythmia detected.",
    interpretation:
      "Normal 12-lead ECG. No evidence of ischemia or conduction abnormalities. Palpitations likely benign.",
  },
  {
    testType: "echo",
    date: "2026-01-18",
    cardiologist: "Dr. Robert Kim",
    referringPhysician: "Dr. Anil Gupta",
    indication: "New systolic murmur on exam",
    ecgRate: "",
    ecgRhythm: "",
    prInterval: "",
    qrsDuration: "",
    qtcInterval: "",
    ecgAxis: "",
    lvef: "60",
    wallMotion: "Normal global and regional wall motion",
    valveAssessment:
      "Mild mitral valve prolapse with trivial regurgitation. All other valves normal.",
    findings:
      "LV cavity size normal. Normal LV systolic function (LVEF 60%). Mild MVP. No pericardial effusion.",
    interpretation:
      "Mild mitral valve prolapse without hemodynamically significant regurgitation. Normal LV function. No intervention needed at this time.",
  },
  {
    testType: "stress",
    date: "2025-12-05",
    cardiologist: "Dr. Amanda Torres",
    referringPhysician: "Dr. James Patel",
    indication: "Exertional chest tightness, family history of CAD",
    ecgRate: "168",
    ecgRhythm: "Sinus tachycardia at peak exercise",
    prInterval: "",
    qrsDuration: "90",
    qtcInterval: "",
    ecgAxis: "",
    lvef: "",
    wallMotion: "",
    valveAssessment: "",
    findings:
      "Bruce protocol. Achieved 10.2 METs. Max HR 168 bpm (95% predicted). No chest pain during test. No significant ST changes.",
    interpretation:
      "Negative for exercise-induced ischemia. Excellent functional capacity. Symptoms likely non-cardiac.",
  },
];

// ─── Surgical Report ─────────────────────────────────────────────────────────
export const surgicalPresets = [
  {
    procedureName: "Laparoscopic Cholecystectomy",
    cptCode: "47562",
    dateOfSurgery: "2026-02-10",
    surgeon: "Dr. Michael Torres",
    assistantSurgeon: "Dr. Priya Shah",
    anesthesiologist: "Dr. Kevin Huang",
    anesthesiaType: "general",
    estimatedBloodLoss: "50",
    duration: "65",
    complications: "None",
    pathologySpecimen: "Gallbladder with multiple cholesterol stones",
    disposition: "Ambulatory — discharged same day",
    operativeFindings:
      "Gallbladder moderately distended with wall thickening. Multiple stones (largest 1.2cm). Critical view of safety achieved. Cystic duct and artery identified and clipped.",
    postOpPlan:
      "Clear liquids today, advance diet as tolerated. Ibuprofen 400mg q6h PRN pain. Follow-up in 2 weeks.",
  },
  {
    procedureName: "Right Total Knee Arthroplasty",
    cptCode: "27447",
    dateOfSurgery: "2025-11-15",
    surgeon: "Dr. David Park",
    assistantSurgeon: "",
    anesthesiologist: "Dr. Rachel Simmons",
    anesthesiaType: "regional",
    estimatedBloodLoss: "250",
    duration: "110",
    complications: "None",
    pathologySpecimen:
      "Femoral and tibial articular cartilage (severe degeneration)",
    disposition: "Admitted to ortho floor for 2-day recovery",
    operativeFindings:
      "Grade IV chondromalacia of medial and lateral compartments. Complete loss of joint space medially. Components cemented in good alignment.",
    postOpPlan:
      "DVT prophylaxis with enoxaparin 40mg SC daily. PT starting POD1. Weight-bearing as tolerated with walker. Follow-up 6 weeks.",
  },
  {
    procedureName: "Inguinal Hernia Repair (Open, Mesh)",
    cptCode: "49505",
    dateOfSurgery: "2026-01-22",
    surgeon: "Dr. Elena Voss",
    assistantSurgeon: "",
    anesthesiologist: "Dr. Kevin Huang",
    anesthesiaType: "general",
    estimatedBloodLoss: "20",
    duration: "45",
    complications: "None",
    pathologySpecimen: "N/A",
    disposition: "Ambulatory — discharged same day",
    operativeFindings:
      "Right indirect inguinal hernia confirmed. Hernia sac identified, reduced, and polypropylene mesh placed in tension-free repair (Lichtenstein technique).",
    postOpPlan:
      "No heavy lifting (>10 lbs) for 4 weeks. Acetaminophen + ibuprofen for pain. Wound check in 1 week.",
  },
];

// ─── Allergy Profile ─────────────────────────────────────────────────────────
export const allergyPresets = [
  {
    allergen: "Penicillin",
    category: "drug",
    reactionType: "Urticaria (hives), angioedema",
    severity: "moderate",
    verificationStatus: "confirmed",
    status: "active",
    onsetDate: "2018-04-15",
    lastOccurrence: "2018-04-15",
    dateRecorded: "2018-04-20",
    emergencyTreatment: "Diphenhydramine 50mg IM, observed 4 hours. Resolved.",
    documentedBy: "Dr. Sarah Chen",
    notes:
      "Cross-reactivity with amoxicillin likely. Avoid all beta-lactam antibiotics. Use azithromycin or fluoroquinolones as alternatives.",
  },
  {
    allergen: "Peanuts",
    category: "food",
    reactionType: "Anaphylaxis — throat swelling, hypotension, urticaria",
    severity: "life-threatening",
    verificationStatus: "confirmed",
    status: "active",
    onsetDate: "2010-09-01",
    lastOccurrence: "2024-12-20",
    dateRecorded: "2010-09-05",
    emergencyTreatment:
      "Epinephrine auto-injector (0.3mg IM) administered immediately. EMS transported to ED. IV fluids and steroids given.",
    documentedBy: "Dr. James Patel",
    notes:
      "Patient carries EpiPen at all times. Also avoid tree nuts (cross-contamination risk). MedicAlert bracelet worn.",
  },
  {
    allergen: "Iodine Contrast Dye",
    category: "drug",
    reactionType: "Mild urticaria, flushing",
    severity: "mild",
    verificationStatus: "confirmed",
    status: "active",
    onsetDate: "2022-07-10",
    lastOccurrence: "2022-07-10",
    dateRecorded: "2022-07-12",
    emergencyTreatment:
      "Diphenhydramine 25mg PO. Symptoms resolved within 30 minutes.",
    documentedBy: "Dr. Anil Gupta",
    notes:
      "Pre-medicate with prednisone 50mg PO at 13h, 7h, and 1h before contrast + diphenhydramine 50mg PO 1h before if contrast imaging is required.",
  },
];

// ─── Discharge Summary ───────────────────────────────────────────────────────
export const dischargePresets = [
  {
    admissionDate: "2026-02-01",
    dischargeDate: "2026-02-05",
    admissionType: "emergency",
    principalDiagnosis: "Community-Acquired Pneumonia",
    icd10Code: "J18.9",
    secondaryDiagnoses: "Type 2 Diabetes (E11.9), Hypertension (I10)",
    attendingPhysician: "Dr. Sarah Chen",
    dischargeCondition: "Improved — afebrile x48h, tolerating oral antibiotics",
    dischargeDisposition: "Home with outpatient follow-up",
    medicationsOnDischarge:
      "Amoxicillin-clavulanate 875mg BID x 5 days, Metformin 500mg BID, Lisinopril 10mg QD",
    followUpInstructions:
      "PCP follow-up in 7 days. Repeat chest X-ray in 4 weeks. Complete full antibiotic course.",
    restrictions: "No strenuous activity for 1 week. Adequate hydration.",
    returnToErInstructions:
      "Return if fever >101°F, worsening shortness of breath, chest pain, or hemoptysis.",
  },
  {
    admissionDate: "2025-12-10",
    dischargeDate: "2025-12-13",
    admissionType: "elective",
    principalDiagnosis: "Right Total Knee Arthroplasty",
    icd10Code: "Z96.651",
    secondaryDiagnoses: "Osteoarthritis right knee (M17.11), Obesity (E66.01)",
    attendingPhysician: "Dr. David Park",
    dischargeCondition:
      "Stable — ambulating with walker, pain controlled on oral medications",
    dischargeDisposition: "Home with home health PT",
    medicationsOnDischarge:
      "Enoxaparin 40mg SC daily x 14 days, Oxycodone 5mg q6h PRN, Acetaminophen 1000mg q8h, Stool softener daily",
    followUpInstructions:
      "Ortho follow-up in 2 weeks for staple removal. Home PT 3x/week. Outpatient PT starting week 3.",
    restrictions:
      "No driving for 4 weeks. No crossing legs or sitting in low chairs. Use walker at all times.",
    returnToErInstructions:
      "Return if calf swelling/pain (DVT concern), wound drainage/redness, fever >101°F, or fall.",
  },
  {
    admissionDate: "2026-01-18",
    dischargeDate: "2026-01-20",
    admissionType: "emergency",
    principalDiagnosis: "Acute Appendicitis",
    icd10Code: "K35.80",
    secondaryDiagnoses: "None",
    attendingPhysician: "Dr. Michael Torres",
    dischargeCondition:
      "Good — tolerating regular diet, afebrile, ambulating independently",
    dischargeDisposition: "Home",
    medicationsOnDischarge:
      "Ibuprofen 400mg q6h PRN pain x 5 days, Docusate 100mg BID x 5 days",
    followUpInstructions:
      "Surgeon follow-up in 10 days. Resume normal diet. May shower after 48h, no baths for 2 weeks.",
    restrictions:
      "No heavy lifting (>15 lbs) for 4 weeks. Light activity only.",
    returnToErInstructions:
      "Return if fever >100.4°F, increasing abdominal pain, wound redness/drainage, or persistent nausea/vomiting.",
  },
];

// ─── Mental Health ───────────────────────────────────────────────────────────
export const mentalHealthPresets = [
  {
    sessionType: "individual",
    sessionDate: "2026-03-05",
    clinician: "Dr. Emily Ross, PsyD",
    dsm5Diagnosis: "Generalized Anxiety Disorder",
    dsm5Code: "F41.1",
    phq9Score: "8",
    gad7Score: "14",
    cssrs: "Negative — no suicidal ideation",
    safetyPlan: "N/A — no safety concerns at this time",
    treatmentModality: "CBT",
    clinicalNotes:
      "Patient reports persistent worry about work performance and health. Sleep onset difficulty (30-45 min). Practiced progressive muscle relaxation between sessions with some benefit. Introduced cognitive restructuring — identifying catastrophic thinking patterns.",
    treatmentPlanUpdate:
      "Continue weekly CBT sessions. Assign thought record homework. Consider GAD-7 recheck in 4 weeks. If no improvement, discuss SSRI adjustment with prescriber.",
  },
  {
    sessionType: "follow-up",
    sessionDate: "2026-02-20",
    clinician: "Dr. Marcus Webb, MD",
    dsm5Diagnosis: "Major Depressive Disorder, Recurrent, Moderate",
    dsm5Code: "F33.1",
    phq9Score: "14",
    gad7Score: "7",
    cssrs:
      "Passive ideation — 'sometimes I wish I could just disappear' — no plan, no intent",
    safetyPlan:
      "Updated safety plan: (1) Call therapist Dr. Ross, (2) Call crisis line 988, (3) Go to nearest ED. Emergency contacts: sister Maria (555-0187).",
    treatmentModality: "medication management",
    clinicalNotes:
      "Patient on sertraline 50mg x 6 weeks with partial response. Energy and motivation remain low. Appetite decreased. Increased dose to sertraline 100mg. Continue therapy with Dr. Ross.",
    treatmentPlanUpdate:
      "Sertraline increased to 100mg QD. Follow-up in 2 weeks to assess tolerability. PHQ-9 recheck at next visit. Continue weekly therapy.",
  },
  {
    sessionType: "individual",
    sessionDate: "2026-01-30",
    clinician: "Dr. Emily Ross, PsyD",
    dsm5Diagnosis: "Post-Traumatic Stress Disorder",
    dsm5Code: "F43.10",
    phq9Score: "11",
    gad7Score: "12",
    cssrs: "Negative",
    safetyPlan: "Existing safety plan reviewed — no changes needed",
    treatmentModality: "EMDR",
    clinicalNotes:
      "Session 4 of EMDR reprocessing targeting motor vehicle accident (2024). Patient able to hold dual awareness during bilateral stimulation. SUD decreased from 8 to 4 during session. Some emotional flooding noted — grounding techniques used.",
    treatmentPlanUpdate:
      "Continue EMDR reprocessing next session. Patient to practice container exercise between sessions. Nightmares decreased from 5/week to 2/week — positive trajectory.",
  },
];

// ─── Imaging Report ──────────────────────────────────────────────────────────
export const imagingPresets = [
  {
    examDate: "2026-03-01",
    modality: "X-ray",
    bodyPart: "Chest PA and Lateral",
    indication: "Persistent cough for 3 weeks, rule out pneumonia",
    contrastUsed: "none",
    radiologist: "Dr. Patricia Huang, MD",
    facility: "City General Hospital Radiology",
    accessionNumber: "RAD-2026-08842",
    findings:
      "Lungs are clear bilaterally. No focal consolidation, effusion, or pneumothorax. Heart size is normal. Mediastinal contours are unremarkable. No bony abnormalities.",
    impression: "Normal chest radiograph. No acute cardiopulmonary disease.",
    comparison: "Prior chest X-ray from 2025-06-15 — no interval change.",
    recommendations: "Clinical correlation recommended if symptoms persist.",
    notes: "",
  },
  {
    examDate: "2026-02-15",
    modality: "MRI",
    bodyPart: "Right Knee",
    indication: "Knee pain and instability after twisting injury",
    contrastUsed: "none",
    radiologist: "Dr. William Chen, MD",
    facility: "Advanced Imaging Center",
    accessionNumber: "RAD-2026-07201",
    findings:
      "Grade 2 partial tear of the anterior cruciate ligament (ACL). Mild bone bruise involving lateral femoral condyle and posterior tibial plateau. Medial meniscus intact. Lateral meniscus — small posterior horn tear. No loose bodies. Moderate joint effusion.",
    impression:
      "Partial ACL tear with lateral meniscus posterior horn tear. Bone bruising consistent with pivot-shift mechanism.",
    comparison: "No prior imaging available for comparison.",
    recommendations:
      "Orthopedic consultation recommended for surgical vs. conservative management discussion. MRI follow-up in 6-8 weeks if conservative approach chosen.",
    notes: "",
  },
  {
    examDate: "2026-01-08",
    modality: "CT",
    bodyPart: "Abdomen and Pelvis",
    indication: "Acute right lower quadrant pain, rule out appendicitis",
    contrastUsed: "IV and oral contrast",
    radiologist: "Dr. Patricia Huang, MD",
    facility: "City General Hospital Radiology",
    accessionNumber: "RAD-2026-01557",
    findings:
      "Appendix measures 11mm in diameter with periappendiceal fat stranding and mild wall enhancement. No appendicolith. No free fluid. Liver, spleen, pancreas, kidneys, and adrenals are unremarkable.",
    impression: "Findings consistent with acute uncomplicated appendicitis.",
    comparison: "No prior CT available.",
    recommendations: "Surgical consultation recommended.",
    notes: "",
  },
];

// ─── Pathology Report ────────────────────────────────────────────────────────
export const pathologyPresets = [
  {
    specimenDate: "2026-02-10",
    reportDate: "2026-02-17",
    specimenType: "Excisional biopsy",
    specimenSite: "Left breast, upper outer quadrant",
    clinicalHistory:
      "52-year-old female with suspicious microcalcifications on screening mammogram (BI-RADS 4B).",
    pathologist: "Dr. Rebecca Nguyen, MD",
    grossDescription:
      "Received a 3.2 x 2.8 x 1.5 cm tissue specimen. External surface inked. Serially sectioned revealing firm, tan-white tissue.",
    microscopicFindings:
      "Ductal carcinoma in situ (DCIS), cribriform and solid patterns. Nuclear grade 2. No comedonecrosis. No invasive carcinoma identified.",
    diagnosis: "Ductal carcinoma in situ (DCIS), intermediate grade",
    grade: "Nuclear grade 2/3",
    margins:
      "Closest margin: 3mm (inferior). All other margins >10mm. No margin involvement.",
    stage: "Tis N0 M0 (Stage 0)",
    specialStains:
      "ER: Positive (95%), PR: Positive (80%), HER2: Negative (1+)",
    notes:
      "Multidisciplinary tumor board review recommended. Sentinel lymph node biopsy not indicated for pure DCIS.",
  },
  {
    specimenDate: "2026-01-22",
    reportDate: "2026-01-26",
    specimenType: "Surgical specimen",
    specimenSite: "Gallbladder",
    clinicalHistory:
      "45-year-old male with recurrent biliary colic. Elective laparoscopic cholecystectomy.",
    pathologist: "Dr. Andrew Kim, MD",
    grossDescription:
      "Gallbladder measures 8.5 x 3.0 x 2.5 cm. Wall thickness 3mm. Mucosa shows diffuse congestion. Lumen contains multiple faceted yellow-brown stones (largest 1.2 cm).",
    microscopicFindings:
      "Chronic cholecystitis with Rokitansky-Aschoff sinuses. Mild chronic inflammation. No dysplasia or malignancy.",
    diagnosis: "Chronic cholecystitis with cholelithiasis",
    grade: "N/A",
    margins: "Cystic duct margin: Negative",
    stage: "N/A",
    specialStains: "None required",
    notes: "Routine case. No follow-up pathology needed.",
  },
  {
    specimenDate: "2025-12-18",
    reportDate: "2025-12-22",
    specimenType: "Punch biopsy",
    specimenSite: "Right forearm, dorsal surface",
    clinicalHistory:
      "38-year-old male with rapidly growing pigmented lesion. Clinical concern for melanoma.",
    pathologist: "Dr. Rebecca Nguyen, MD",
    grossDescription:
      "Punch biopsy 4mm diameter. Darkly pigmented lesion measuring 6mm at skin surface.",
    microscopicFindings:
      "Atypical melanocytic proliferation with pagetoid spread. Asymmetric architecture. Breslow thickness 0.8mm. No ulceration. Mitotic rate <1/mm². No lymphovascular invasion.",
    diagnosis: "Malignant melanoma, superficial spreading type",
    grade: "Clark level III, Breslow 0.8mm",
    margins: "Peripheral margins positive — excision recommended",
    stage: "pT1a (pending sentinel node biopsy)",
    specialStains: "S-100: Positive, HMB-45: Positive, Ki-67: 5%",
    notes:
      "Wide local excision with 1cm margins recommended. Sentinel lymph node biopsy to be discussed given borderline thickness.",
  },
];

// ─── Genetic Report ──────────────────────────────────────────────────────────
export const geneticPresets = [
  {
    testDate: "2026-02-05",
    testType: "Targeted gene panel",
    geneName: "BRCA1",
    variant: "c.5266dupC (p.Gln1756Profs*74)",
    zygosity: "heterozygous",
    acmgClassification: "Pathogenic",
    inheritancePattern: "Autosomal dominant",
    associatedCondition: "Hereditary Breast and Ovarian Cancer Syndrome (HBOC)",
    lab: "Invitae Genetics",
    orderingProvider: "Dr. Sarah Chen",
    clinicalInterpretation:
      "Pathogenic variant in BRCA1 associated with significantly increased lifetime risk of breast cancer (60-80%) and ovarian cancer (40-60%). Also elevated risk for pancreatic and prostate cancer in males.",
    recommendations:
      "Referral to genetic counselor. Enhanced screening with breast MRI alternating with mammogram every 6 months. Discuss risk-reducing surgery options. PARP inhibitor eligibility if cancer develops.",
    familyImplications:
      "First-degree relatives (siblings, children) have 50% chance of carrying this variant. Cascade genetic testing strongly recommended for mother, sister, and adult daughter.",
    notes: "",
  },
  {
    testDate: "2025-11-20",
    testType: "Whole exome sequencing",
    geneName: "MTHFR",
    variant: "c.665C>T (p.Ala222Val) — rs1801133",
    zygosity: "homozygous",
    acmgClassification: "Benign/Risk factor",
    inheritancePattern: "Autosomal recessive (for homozygous effect)",
    associatedCondition:
      "Reduced MTHFR enzyme activity (~30% of normal). Associated with elevated homocysteine levels.",
    lab: "GeneDx Laboratory",
    orderingProvider: "Dr. Anil Gupta",
    clinicalInterpretation:
      "Homozygous C677T MTHFR variant. Common polymorphism. May result in mildly elevated homocysteine. Clinical significance is modest and context-dependent.",
    recommendations:
      "Check serum homocysteine level. If elevated, consider methylfolate supplementation (L-methylfolate 1mg daily). Ensure adequate B12 and folate intake. No major clinical intervention required.",
    familyImplications:
      "Both parents are obligate carriers. Siblings have 25% chance of homozygous genotype. Low clinical significance — routine cascade testing not indicated.",
    notes: "Incidental finding on WES ordered for unrelated indication.",
  },
  {
    testDate: "2026-01-12",
    testType: "Pharmacogenomic panel",
    geneName: "CYP2D6",
    variant: "*4/*4 (Poor Metabolizer)",
    zygosity: "homozygous",
    acmgClassification: "Pathogenic (pharmacogenomic context)",
    inheritancePattern: "Autosomal co-dominant",
    associatedCondition:
      "CYP2D6 Poor Metabolizer phenotype — affects metabolism of ~25% of common drugs including codeine, tramadol, tamoxifen, SSRIs, and beta-blockers.",
    lab: "OneOme RightMed",
    orderingProvider: "Dr. James Patel",
    clinicalInterpretation:
      "Patient is a CYP2D6 poor metabolizer. Codeine and tramadol will be ineffective (cannot convert to active metabolites). Tamoxifen may have reduced efficacy. Some SSRIs may accumulate — dose adjustment needed.",
    recommendations:
      "Flag in EHR as CYP2D6 Poor Metabolizer. Avoid codeine and tramadol (use alternatives). If tamoxifen needed, consider aromatase inhibitor instead. For SSRIs, prefer sertraline or citalopram (less CYP2D6 dependent). Consult pharmacist for all new prescriptions.",
    familyImplications:
      "Both parents carry at least one *4 allele. Siblings may be intermediate or poor metabolizers. Pharmacogenomic testing recommended before prescribing CYP2D6-substrate medications.",
    notes: "",
  },
];

// ─── Vision Exam ─────────────────────────────────────────────────────────────
export const visionPresets = [
  {
    examDate: "2026-03-02",
    examType: "Comprehensive",
    examiner: "Dr. Jennifer Liu, OD",
    vaOdUncorrected: "20/40",
    vaOsUncorrected: "20/50",
    vaOdCorrected: "20/20",
    vaOsCorrected: "20/20",
    sphereOd: "-2.25",
    sphereOs: "-2.75",
    cylinderOd: "-0.50",
    cylinderOs: "-0.75",
    axisOd: "90",
    axisOs: "85",
    addPower: "",
    pd: "63",
    iopOd: "14",
    iopOs: "15",
    anteriorSegment:
      "Clear cornea OU. Deep and quiet anterior chambers. No cataracts.",
    posteriorSegment:
      "Cup-to-disc ratio 0.3 OU. Macula flat and clear. No peripheral retinal abnormalities.",
    diagnosis: "Myopia with astigmatism, both eyes (H52.203)",
    plan: "Updated spectacle prescription. Return in 12 months for routine exam.",
    notes: "",
  },
  {
    examDate: "2026-01-15",
    examType: "Diabetic screening",
    examiner: "Dr. Thomas Park, MD (Ophthalmology)",
    vaOdUncorrected: "20/30",
    vaOsUncorrected: "20/30",
    vaOdCorrected: "20/20",
    vaOsCorrected: "20/25",
    sphereOd: "-1.50",
    sphereOs: "-1.75",
    cylinderOd: "",
    cylinderOs: "-0.25",
    axisOd: "",
    axisOs: "180",
    addPower: "+1.50",
    pd: "65",
    iopOd: "16",
    iopOs: "17",
    anteriorSegment:
      "Mild nuclear sclerosis OU. No neovascularization of iris.",
    posteriorSegment:
      "Scattered dot-blot hemorrhages in mid-periphery OU. 2 microaneurysms OS. No macular edema. No neovascularization.",
    diagnosis:
      "Mild non-proliferative diabetic retinopathy, bilateral (E11.319)",
    plan: "Monitor every 6 months. Optimize blood glucose control (target HbA1c <7%). OCT macula at next visit.",
    notes:
      "Discussed findings with patient. Emphasized importance of glycemic control.",
  },
  {
    examDate: "2025-11-10",
    examType: "Contact lens fitting",
    examiner: "Dr. Jennifer Liu, OD",
    vaOdUncorrected: "20/100",
    vaOsUncorrected: "20/80",
    vaOdCorrected: "20/20",
    vaOsCorrected: "20/20",
    sphereOd: "-4.50",
    sphereOs: "-3.75",
    cylinderOd: "-1.25",
    cylinderOs: "-0.75",
    axisOd: "175",
    axisOs: "10",
    addPower: "",
    pd: "62",
    iopOd: "13",
    iopOs: "14",
    anteriorSegment:
      "Clear corneas OU. No papillae or follicles on lid eversion. Tear film adequate.",
    posteriorSegment: "Healthy fundi OU. C/D 0.25 OU. Flat maculae.",
    diagnosis: "Myopia with astigmatism OU. Contact lens candidate.",
    plan: "Fitted with toric soft contact lenses. Trial pair dispensed. Return in 1 week for follow-up. Instruction on insertion/removal and care given.",
    notes: "Patient prefers daily disposable lenses for convenience.",
  },
];

// ─── Dental Record ───────────────────────────────────────────────────────────
export const dentalPresets = [
  {
    visitDate: "2026-03-04",
    visitType: "Prophylaxis / Cleaning",
    dentist: "Dr. Lisa Nakamura, DDS",
    facility: "Bright Smile Dental",
    toothNumbers: "All",
    cdtCode: "D1110",
    procedureDescription:
      "Adult prophylaxis with ultrasonic scaling and hand instruments. Polish with fine prophy paste. Fluoride varnish applied.",
    periodontalStatus:
      "Mild gingivitis in mandibular anterior region. Probing depths 2-3mm throughout. No attachment loss.",
    xrayFindings:
      "Bitewings taken — no interproximal caries detected. Bone levels normal.",
    anesthesia: "None required",
    materialsUsed: "Prophy paste, 5% NaF varnish",
    oralHygieneStatus:
      "Fair — moderate plaque accumulation interproximally. Recommended daily flossing and electric toothbrush.",
    treatmentPlan: "Routine prophylaxis in 6 months. Monitor gingivitis.",
    nextAppointment: "2026-09-04",
    notes: "",
  },
  {
    visitDate: "2026-02-12",
    visitType: "Restorative",
    dentist: "Dr. Mark Alvarez, DDS",
    facility: "Downtown Dental Care",
    toothNumbers: "#14, #19",
    cdtCode: "D2391, D2392",
    procedureDescription:
      "Composite resin restorations on #14 (MO) and #19 (MOD). Caries excavated, selective etch, bonding agent applied, composite placed and light-cured in 2mm increments. Occlusion checked and adjusted.",
    periodontalStatus: "Healthy periodontium. No concerns.",
    xrayFindings:
      "Pre-op periapicals: Class II carious lesions on #14 mesial-occlusal and #19 mesial-occlusal-distal. No periapical pathology.",
    anesthesia:
      "Local anesthesia: Lidocaine 2% with 1:100,000 epinephrine. #14: PSA block + buccal infiltration. #19: IAN block + long buccal.",
    materialsUsed:
      "Composite resin (A2 shade), Scotchbond Universal, SDR flowable liner",
    oralHygieneStatus: "Good. Brushing 2x/day with fluoride toothpaste.",
    treatmentPlan:
      "Restorations complete. Return for routine cleaning in 4 months.",
    nextAppointment: "2026-06-12",
    notes:
      "Patient tolerated procedure well. No post-op sensitivity anticipated.",
  },
  {
    visitDate: "2026-01-08",
    visitType: "Emergency / Pain",
    dentist: "Dr. Lisa Nakamura, DDS",
    facility: "Bright Smile Dental",
    toothNumbers: "#30",
    cdtCode: "D3220",
    procedureDescription:
      "Emergency pulpotomy on #30 due to symptomatic irreversible pulpitis. Access opening, coronal pulp removed, hemostasis achieved with NaOCl irrigation, MTA placed over pulp stumps, temporary restoration (IRM) placed.",
    periodontalStatus:
      "Localized — #30 had deep probing (6mm distal). Otherwise healthy.",
    xrayFindings:
      "Periapical radiograph #30: Deep carious lesion approaching pulp. Widened PDL space at apex. No definitive periapical radiolucency.",
    anesthesia:
      "Local anesthesia: Articaine 4% with 1:100,000 epinephrine — IAN block + buccal infiltration.",
    materialsUsed: "MTA (ProRoot), IRM temporary filling, NaOCl irrigant",
    oralHygieneStatus: "Fair. Patient reports irregular flossing.",
    treatmentPlan:
      "Root canal therapy (RCT) on #30 scheduled in 2 weeks. Crown restoration after RCT completion.",
    nextAppointment: "2026-01-22",
    notes:
      "Patient presented with severe spontaneous throbbing pain in lower right. Cold test: lingering pain. Prescribed ibuprofen 600mg q6h + amoxicillin 500mg TID x 7 days.",
  },
];

// ─── Physical Therapy ────────────────────────────────────────────────────────
export const physicalTherapyPresets = [
  {
    sessionDate: "2026-03-06",
    sessionNumber: "8",
    therapist: "PT Sarah Williams, DPT",
    referringPhysician: "Dr. David Park",
    diagnosis: "Status post right total knee arthroplasty",
    icd10Code: "Z96.651",
    chiefComplaint: "Stiffness in right knee, difficulty with stairs",
    painLevel: "4",
    functionalStatus:
      "Ambulating with single-point cane. Independent in ADLs. Able to drive.",
    romMeasurements:
      "Right knee: Flexion 115° (goal 130°), Extension 0° (full). Left knee: WNL.",
    strengthTesting:
      "Right quad: 4/5, Right hamstrings: 4/5, Right hip abductors: 4-/5",
    interventions:
      "Stationary bike 10 min warm-up, active-assisted ROM exercises, quad sets, SLR, mini-squats, step-ups (6-inch), balance board",
    exercisePlan:
      "Home program: quad sets 3x20/day, heel slides 3x15/day, standing hip abduction with band 3x12, wall sits 3x30sec",
    modalities: "Ice pack post-exercise 15 min, ultrasound to patellar tendon",
    progressNotes:
      "Good progress. Flexion improved 10° since last visit. Patient motivated and compliant with HEP. Pain well-controlled.",
    goalsUpdate:
      "STG: Achieve 125° flexion by session 12. LTG: Return to recreational hiking by 12 weeks post-op.",
    planNextSession:
      "Progress to higher step (8-inch), introduce lateral stepping, begin single-leg balance",
    notes: "",
  },
  {
    sessionDate: "2026-02-20",
    sessionNumber: "3",
    therapist: "PT Michael Reeves, DPT",
    referringPhysician: "Dr. Elena Voss",
    diagnosis: "Lumbar disc herniation L4-L5 with left radiculopathy",
    icd10Code: "M51.16",
    chiefComplaint:
      "Low back pain radiating to left leg, numbness in left foot",
    painLevel: "6",
    functionalStatus:
      "Difficulty sitting >20 min. Unable to bend forward. Modified work duties (no lifting).",
    romMeasurements:
      "Lumbar flexion: 40% of normal (pain-limited). Extension: 60%. Lateral flexion: 70% bilateral.",
    strengthTesting:
      "Left EHL (great toe extension): 3+/5 (reduced). Left hip flexor: 4/5. Left ankle dorsiflexion: 4/5.",
    interventions:
      "McKenzie extension exercises, prone press-ups, neural flossing (sciatic nerve), core stabilization (dead bugs, bird dogs), lumbar traction 15 min",
    exercisePlan:
      "Prone press-ups 10 reps every 2 hours, standing lumbar extension hourly, pelvic tilts 3x15/day, avoid prolonged sitting",
    modalities:
      "Mechanical lumbar traction (intermittent, 30% body weight, 15 min), TENS unit",
    progressNotes:
      "Centralization of symptoms noted with extension exercises — leg pain decreasing, now primarily in buttock/proximal thigh. Good sign.",
    goalsUpdate:
      "STG: Centralize symptoms to back only within 4 sessions. LTG: Return to full work duties by 8 weeks.",
    planNextSession:
      "Continue McKenzie protocol, progress core exercises, reassess neural tension signs",
    notes:
      "Patient advised to avoid flexion-based activities and prolonged sitting.",
  },
  {
    sessionDate: "2026-01-28",
    sessionNumber: "1",
    therapist: "PT Sarah Williams, DPT",
    referringPhysician: "Dr. James Patel",
    diagnosis: "Frozen shoulder (adhesive capsulitis), right",
    icd10Code: "M75.01",
    chiefComplaint:
      "Progressive right shoulder stiffness and pain for 4 months. Cannot reach overhead or behind back.",
    painLevel: "7",
    functionalStatus:
      "Unable to reach top shelf, dress overhead, or fasten bra. Sleep disrupted by pain when lying on right side.",
    romMeasurements:
      "Right shoulder: Flexion 95° (normal 180°), Abduction 70° (normal 180°), ER 15° (normal 90°), IR hand to buttock only.",
    strengthTesting:
      "Deferred due to pain and ROM limitation. Grossly 3+/5 for shoulder girdle musculature.",
    interventions:
      "Gentle PROM within pain tolerance, pendulum exercises, assisted pulleys, scapular stabilization isometrics, moist heat pre-exercise",
    exercisePlan:
      "Pendulum exercises 3x/day (2 min each direction), supine wand flexion 3x10, table slides 3x10, scapular squeezes 3x15",
    modalities: "Moist heat 15 min pre-exercise, ice post-session",
    progressNotes:
      "Initial evaluation. Stage 2 (freezing phase) of adhesive capsulitis. Significant ROM deficits. Patient educated on expected timeline (6-18 months).",
    goalsUpdate:
      "STG: Improve flexion to 120° and ER to 30° by session 8. LTG: Functional ROM for ADLs within 6 months.",
    planNextSession:
      "Continue gentle ROM progression, add wall walks, assess response to initial program",
    notes:
      "Discussed that aggressive stretching is counterproductive in freezing phase. Gentle, consistent approach preferred.",
  },
];

// ─── Nutrition Assessment ────────────────────────────────────────────────────
export const nutritionPresets = [
  {
    assessmentDate: "2026-03-03",
    dietitian: "RD Jessica Park, MS, RDN",
    referralReason: "Type 2 DM — dietary counseling for glycemic control",
    height: "170",
    weight: "88",
    bmi: "30.4",
    waist: "102",
    bodyFat: "32",
    nutritionalStatus: "Overweight with metabolic risk",
    screeningTool: "MNA-SF (Mini Nutritional Assessment)",
    screeningScore: "11 (normal)",
    dietaryHistory:
      "3 meals/day, frequent snacking (chips, cookies). High carb intake (~300g/day). Low fiber (~12g/day). Drinks 2 sodas daily. Limited vegetable intake.",
    foodAllergies: "None",
    supplements: "Multivitamin daily, Vitamin D 2000 IU",
    labValues:
      "HbA1c: 7.2%, Fasting glucose: 138 mg/dL, Triglycerides: 210 mg/dL",
    diagnosis: "Overweight (E66.3) with poorly controlled Type 2 DM (E11.65)",
    goals:
      "Reduce HbA1c to <7%. Lose 5kg over 3 months. Increase fiber to 25g/day. Eliminate sugar-sweetened beverages.",
    carePlan:
      "Mediterranean-style eating pattern. Plate method education (1/2 vegetables, 1/4 protein, 1/4 whole grains). Replace sodas with water/unsweetened tea. Limit refined carbs. Add 2 servings vegetables per meal.",
    followUp: "4 weeks — reassess dietary adherence and weight",
    notes: "",
  },
  {
    assessmentDate: "2026-02-10",
    dietitian: "RD Michael Torres, RDN, CSSD",
    referralReason: "Sports nutrition — marathon training optimization",
    height: "178",
    weight: "72",
    bmi: "22.7",
    waist: "80",
    bodyFat: "14",
    nutritionalStatus: "Well-nourished, athletic build",
    screeningTool: "N/A — sports nutrition consult",
    screeningScore: "",
    dietaryHistory:
      "5 meals/day including pre/post-workout. Currently ~2800 kcal/day. Carbs 55%, protein 20%, fat 25%. Adequate hydration (3L/day).",
    foodAllergies: "Lactose intolerant",
    supplements:
      "Whey protein isolate (lactose-free), Electrolyte tablets, Iron 18mg (ferritin was low-normal)",
    labValues:
      "Ferritin: 32 ng/mL (low-normal), Vitamin D: 38 ng/mL, B12: normal",
    diagnosis: "No nutritional deficiency. Sports performance optimization.",
    goals:
      "Optimize fueling for marathon training (peak weeks 60-70 miles). Maintain iron stores. Prevent GI distress during long runs.",
    carePlan:
      "Increase to 3200 kcal on heavy training days. Carb loading protocol for race week (8-10g/kg). During-run fueling: 60g carbs/hour (gels + sports drink). Post-run: 20g protein + 60g carbs within 30 min. Switch to lactose-free dairy.",
    followUp: "6 weeks — mid-training block reassessment",
    notes: "Race day: Boston Marathon, April 2026.",
  },
  {
    assessmentDate: "2026-01-20",
    dietitian: "RD Jessica Park, MS, RDN",
    referralReason:
      "Unintentional weight loss, post-chemotherapy appetite management",
    height: "165",
    weight: "52",
    bmi: "19.1",
    waist: "72",
    bodyFat: "",
    nutritionalStatus: "Malnourished — moderate risk",
    screeningTool: "PG-SGA (Patient-Generated Subjective Global Assessment)",
    screeningScore: "9 (critical need for nutrition intervention)",
    dietaryHistory:
      "Intake reduced to ~1200 kcal/day (estimated needs: 1800). Nausea limits meal size. Aversion to meat and strong flavors. Tolerates bland, cold foods best.",
    foodAllergies: "None",
    supplements: "Ensure Plus 2x/day, Multivitamin, Zinc 15mg, Omega-3",
    labValues:
      "Albumin: 3.0 g/dL (low), Prealbumin: 14 mg/dL (low), CRP: elevated",
    diagnosis:
      "Protein-calorie malnutrition, moderate (E44.0). Cancer-related cachexia.",
    goals:
      "Prevent further weight loss. Increase caloric intake to 1600 kcal minimum. Improve protein intake to 1.2g/kg/day.",
    carePlan:
      "Small frequent meals (6x/day). Cold/room temp foods preferred. High-calorie smoothies (avocado, nut butter, banana, protein powder). Ginger tea for nausea. Add MCT oil to foods. Oral nutrition supplements between meals.",
    followUp: "2 weeks — weight check and intake reassessment",
    notes:
      "Patient completing cycle 4 of 6 (breast cancer, AC-T protocol). Coordinating with oncology team.",
  },
];

// ─── Emergency Record ────────────────────────────────────────────────────────
export const emergencyPresets = [
  {
    arrivalDate: "2026-03-08",
    arrivalTime: "02:45",
    arrivalMode: "ambulance",
    chiefComplaint: "Severe chest pain radiating to left arm, onset 1 hour ago",
    triageCategory: "2",
    triageNurse: "RN Karen Mitchell",
    bpSystolic: "158",
    bpDiastolic: "94",
    heartRate: "102",
    respiratoryRate: "22",
    temperature: "37.0",
    spo2: "96",
    gcs: "15",
    attendingPhysician: "Dr. Robert Chang, MD",
    hpi: "62-year-old male with sudden onset substernal chest pain while watching TV at 1:45 AM. Pain described as crushing, 8/10, radiating to left arm and jaw. Associated with diaphoresis and nausea. PMH: HTN, hyperlipidemia, former smoker (30 pack-year, quit 5 years ago).",
    physicalExam:
      "Diaphoretic, anxious. Heart: regular rate, no murmurs. Lungs: clear bilaterally. Abdomen: soft, non-tender. Extremities: no edema.",
    diagnosticTests:
      "ECG: ST elevation in leads II, III, aVF (inferior STEMI). Troponin I: 2.8 ng/mL (elevated). CBC, BMP: within normal limits. Chest X-ray: no acute findings.",
    interventions:
      "Aspirin 325mg PO, Heparin 5000 units IV bolus, Nitroglycerin SL x 2 (partial relief), Morphine 4mg IV. Cardiology activated for emergent cardiac catheterization.",
    edDiagnosis: "Acute ST-elevation myocardial infarction (inferior wall)",
    icd10Code: "I21.19",
    disposition: "Admitted to cardiac catheterization lab → CCU",
    dischargeInstructions: "N/A — admitted",
    notes:
      "Door-to-balloon time: 52 minutes. PCI to RCA performed successfully — single stent placed.",
  },
  {
    arrivalDate: "2026-02-22",
    arrivalTime: "16:30",
    arrivalMode: "walk-in",
    chiefComplaint: "Right ankle injury after fall during basketball",
    triageCategory: "4",
    triageNurse: "RN David Chen",
    bpSystolic: "124",
    bpDiastolic: "78",
    heartRate: "84",
    respiratoryRate: "16",
    temperature: "36.8",
    spo2: "99",
    gcs: "15",
    attendingPhysician: "Dr. Sandra Lee, MD",
    hpi: "28-year-old male landed awkwardly while playing basketball 2 hours ago. Felt a pop in right ankle. Immediate swelling and inability to bear weight. No head injury. No other complaints.",
    physicalExam:
      "Right ankle: significant swelling over lateral malleolus. Tenderness over distal fibula and ATFL. Positive anterior drawer test. Unable to bear weight. Distally neurovascularly intact. Ottawa ankle rules positive.",
    diagnosticTests:
      "X-ray right ankle (AP, lateral, mortise): Non-displaced distal fibula fracture (Weber A). No talar shift. Tibia intact.",
    interventions:
      "Ice, elevation, posterior splint applied. Crutches fitted. Ibuprofen 600mg PO. Tetanus status confirmed up-to-date.",
    edDiagnosis: "Closed fracture of right lateral malleolus (Weber A)",
    icd10Code: "S82.61XA",
    disposition: "Discharged home with orthopedic follow-up",
    dischargeInstructions:
      "RICE protocol (rest, ice, compression, elevation). Non-weight-bearing right leg with crutches. Ibuprofen 600mg q6h with food. Orthopedic follow-up within 5 days for cast application.",
    notes: "",
  },
  {
    arrivalDate: "2026-01-15",
    arrivalTime: "21:10",
    arrivalMode: "walk-in",
    chiefComplaint: "Severe allergic reaction after eating shrimp",
    triageCategory: "2",
    triageNurse: "RN Karen Mitchell",
    bpSystolic: "92",
    bpDiastolic: "58",
    heartRate: "118",
    respiratoryRate: "24",
    temperature: "37.2",
    spo2: "94",
    gcs: "15",
    attendingPhysician: "Dr. Robert Chang, MD",
    hpi: "35-year-old female ate shrimp at a restaurant 30 minutes ago. Developed lip/tongue swelling, diffuse urticaria, throat tightness, and lightheadedness within 10 minutes. Self-administered EpiPen (0.3mg IM) in right thigh en route. Known shellfish allergy but unaware dish contained shrimp.",
    physicalExam:
      "Anxious, voice slightly hoarse. Diffuse urticaria on trunk and extremities. Lips mildly edematous (improving). Lungs: mild expiratory wheeze bilaterally. Heart: tachycardic, regular. Abdomen: mild diffuse tenderness.",
    diagnosticTests:
      "None — clinical diagnosis of anaphylaxis. Tryptase level drawn (pending).",
    interventions:
      "Epinephrine 0.3mg IM left thigh (second dose — first was self-administered). Normal saline 1L IV bolus. Diphenhydramine 50mg IV. Methylprednisolone 125mg IV. Famotidine 20mg IV. Albuterol nebulizer x 1. Symptoms improving within 20 minutes.",
    edDiagnosis: "Anaphylaxis due to shellfish ingestion",
    icd10Code: "T78.00XA",
    disposition: "Observation for 6 hours then discharged",
    dischargeInstructions:
      "Prescribe EpiPen 2-pack (always carry). Prednisone 40mg PO daily x 3 days. Cetirizine 10mg daily x 5 days. Avoid all shellfish strictly. Allergist referral within 2 weeks. Return immediately if symptoms recur (biphasic reaction possible within 4-12 hours).",
    notes:
      "Patient education on reading food labels and restaurant communication regarding allergy.",
  },
];

// ─── Referral Letter ─────────────────────────────────────────────────────────
export const referralPresets = [
  {
    referralDate: "2026-03-07",
    urgency: "routine",
    referringProvider: "Dr. Sarah Chen, MD (Internal Medicine)",
    referringFacility: "Central Medical Associates",
    specialtyRequested: "Cardiology",
    specificProvider: "Dr. Robert Kim, MD",
    referralReason:
      "New systolic murmur detected on routine exam. Grade 2/6, best heard at apex. Asymptomatic. Request echocardiogram and evaluation.",
    clinicalSummary:
      "52-year-old female with hypertension (controlled on lisinopril 10mg) and no prior cardiac history. New murmur noted during annual physical. No chest pain, dyspnea, syncope, or exercise intolerance.",
    relevantDiagnosis: "Heart murmur, unspecified (R01.1)",
    icd10Code: "R01.1",
    relevantTests:
      "ECG (2026-03-07): Normal sinus rhythm, no ST-T changes. BNP: 45 pg/mL (normal).",
    questionsForSpecialist:
      "1. Is echocardiogram indicated? 2. Any structural abnormality requiring follow-up? 3. Any activity restrictions needed?",
    insuranceAuth: "Pre-auth not required per Aetna PPO plan",
    notes: "",
  },
  {
    referralDate: "2026-02-20",
    urgency: "urgent",
    referringProvider: "Dr. James Patel, MD (Family Medicine)",
    referringFacility: "Westside Family Practice",
    specialtyRequested: "Gastroenterology",
    specificProvider: "",
    referralReason:
      "6 weeks of progressive dysphagia to solids, 10-lb unintentional weight loss, and iron-deficiency anemia. Upper endoscopy requested.",
    clinicalSummary:
      "58-year-old male with progressive difficulty swallowing solids over 6 weeks. Now reports food 'getting stuck' at mid-sternum. Unintentional 10-lb weight loss. No odynophagia, no hematemesis. Labs: Hgb 10.2 g/dL, MCV 72 fL, ferritin 8 ng/mL.",
    relevantDiagnosis:
      "Dysphagia, unspecified (R13.10). Iron-deficiency anemia (D50.9)",
    icd10Code: "R13.10",
    relevantTests:
      "CBC: Hgb 10.2 g/dL, MCV 72, Ferritin 8. Barium swallow: distal esophageal narrowing. CMP: normal.",
    questionsForSpecialist:
      "1. Urgent EGD with biopsy recommended. 2. Please evaluate for malignancy vs. stricture. 3. Dilation if appropriate.",
    insuranceAuth:
      "Pre-auth submitted to UnitedHealthcare — reference #UHC-2026-08843",
    notes:
      "Patient aware of concern for esophageal pathology. Anxious but cooperative.",
  },
  {
    referralDate: "2026-01-30",
    urgency: "routine",
    referringProvider: "Dr. Anil Gupta, MD (Endocrinology)",
    referringFacility: "Endocrine & Diabetes Specialists",
    specialtyRequested: "Ophthalmology (Retina Specialist)",
    specificProvider: "Dr. Thomas Park, MD",
    referralReason:
      "Annual diabetic retinopathy screening. Type 2 DM x 7 years, HbA1c 7.2%.",
    clinicalSummary:
      "45-year-old female with Type 2 DM (7 years), currently on metformin 1000mg BID + empagliflozin 10mg. Last HbA1c 7.2% (improved from 7.8%). Hypertension on lisinopril. No visual complaints currently.",
    relevantDiagnosis:
      "Type 2 DM without complications (E11.9). Due for retinal screening.",
    icd10Code: "E11.9",
    relevantTests:
      "HbA1c: 7.2%. Microalbumin/creatinine ratio: 22 mg/g (normal). Lipid panel: LDL 108.",
    questionsForSpecialist:
      "1. Dilated fundus exam for diabetic retinopathy screening. 2. Any retinopathy present? 3. Recommended screening interval going forward.",
    insuranceAuth: "Not required — annual preventive screening",
    notes:
      "Last eye exam was 14 months ago — showed no retinopathy at that time.",
  },
];

// ─── Generic Medical ─────────────────────────────────────────────────────────
export const genericPresets = [
  {
    date: "2026-03-05",
    provider: "Dr. Sarah Chen",
    content:
      "Annual wellness visit. Patient in good health. No new complaints. All preventive screenings up to date.",
    notes: "Schedule flu vaccine at next visit.",
  },
  {
    date: "2026-02-10",
    provider: "Dr. James Patel",
    content:
      "Follow-up for hypertension management. BP well-controlled on current regimen. Continue lisinopril 10mg daily.",
    notes: "Recheck BP in 3 months. Annual labs due in April.",
  },
  {
    date: "2026-01-15",
    provider: "Dr. Lisa Wong",
    content:
      "Sick visit — upper respiratory infection. Symptoms x 3 days. No fever. Lungs clear. Symptomatic treatment advised.",
    notes: "Return if symptoms worsen or persist beyond 10 days.",
  },
];
