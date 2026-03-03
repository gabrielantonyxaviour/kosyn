export interface DemoDoctor {
  address: string;
  name: string;
  specialty: string;
  fee: number;
  jurisdiction: string;
  registeredAt: number;
}

export interface DemoRecord {
  id: number;
  patientAddress: string;
  recordType: "health" | "consultation" | "certificate" | "prescription";
  templateType: string;
  label: string;
  ipfsCid: string;
  txHash: string;
  createdAt: number;
  createdBy: "patient" | "doctor";
  createdByAddress: string;
  formData?: Record<string, string>;
}

export type BookingStatus =
  | "booked"
  | "access-requested"
  | "access-granted"
  | "in-session"
  | "completed";

export interface DemoBooking {
  id: string;
  patientAddress: string;
  patientName: string;
  doctorAddress: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  fee: number;
  status: BookingStatus;
  consultationId: string;
  requestedRecordTypes?: string[];
  createdAt: number;
}

export interface DemoConsent {
  id: string;
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  recordTypes: string[];
  grantedAt: number;
  expiresAt: number;
  isActive: boolean;
  bookingId: string;
}

export interface DemoAccessLog {
  id: string;
  patientAddress: string;
  accessorAddress: string;
  accessorName: string;
  action: string;
  timestamp: number;
  hasAttestation: boolean;
  consultationId?: string;
}

export interface DemoConsultationResult {
  consultationId: string;
  soapNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  summary?: string;
  medicalCodes?: string[];
  drugInteractions?: string[];
  riskScores?: Record<string, number>;
  proof?: { signature: string; model: string; timestamp: number };
  completedAt: number;
}

// Global singleton — survives Next.js App Router module isolation between route handlers.
// Each API route gets a separate module instance, but they all share the same globalThis.
const g = globalThis as typeof globalThis & {
  __kosynDoctors?: Map<string, DemoDoctor>;
  __kosynRecords?: DemoRecord[];
  __kosynBookings?: Map<string, DemoBooking>;
  __kosynConsents?: Map<string, DemoConsent>;
  __kosynAccessLogs?: DemoAccessLog[];
  __kosynConsultationResults?: Map<string, DemoConsultationResult>;
  __kosynNextRecordId?: number;
  __kosynNextBookingNum?: number;
  __kosynOptedIn?: Set<string>;
};

if (!g.__kosynDoctors) g.__kosynDoctors = new Map<string, DemoDoctor>();
if (!g.__kosynRecords) g.__kosynRecords = [];
if (!g.__kosynBookings) g.__kosynBookings = new Map<string, DemoBooking>();
if (!g.__kosynConsents) g.__kosynConsents = new Map<string, DemoConsent>();
if (!g.__kosynAccessLogs) g.__kosynAccessLogs = [];
if (!g.__kosynConsultationResults)
  g.__kosynConsultationResults = new Map<string, DemoConsultationResult>();
if (g.__kosynNextRecordId === undefined) g.__kosynNextRecordId = 1;
if (g.__kosynNextBookingNum === undefined) g.__kosynNextBookingNum = 1;
if (!g.__kosynOptedIn) g.__kosynOptedIn = new Set<string>();

const doctors = g.__kosynDoctors;
const records = g.__kosynRecords;
const bookings = g.__kosynBookings;
const consents = g.__kosynConsents;
const accessLogs = g.__kosynAccessLogs;
const consultationResults = g.__kosynConsultationResults;
const optedInAddresses = g.__kosynOptedIn;

function getNextRecordId(): number {
  return g.__kosynNextRecordId!++;
}
function getNextBookingNum(): number {
  return g.__kosynNextBookingNum!++;
}

// --- Doctors ---

export function addDoctor(doc: Omit<DemoDoctor, "registeredAt">): DemoDoctor {
  const full: DemoDoctor = { ...doc, registeredAt: Date.now() };
  doctors.set(doc.address.toLowerCase(), full);
  return full;
}

export function getDoctors(): DemoDoctor[] {
  return Array.from(doctors.values());
}

// --- Records ---

export function addRecord(
  rec: Omit<DemoRecord, "id" | "createdAt">,
): DemoRecord {
  const full: DemoRecord = {
    ...rec,
    id: getNextRecordId(),
    createdAt: Date.now(),
  };
  records.push(full);
  return full;
}

export function getRecords(address: string): DemoRecord[] {
  const lower = address.toLowerCase();
  return records
    .filter((r) => r.patientAddress.toLowerCase() === lower)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// --- Bookings ---

export function addBooking(
  b: Omit<DemoBooking, "id" | "status" | "consultationId" | "createdAt">,
): DemoBooking {
  const num = getNextBookingNum();
  const id = `booking-${num}`;
  const consultationId = `consultation-${num}`;
  const full: DemoBooking = {
    ...b,
    id,
    status: "booked",
    consultationId,
    createdAt: Date.now(),
  };
  bookings.set(id, full);
  return full;
}

export function getBookings(
  address: string,
  role: "patient" | "doctor",
): DemoBooking[] {
  const lower = address.toLowerCase();
  return Array.from(bookings.values())
    .filter((b) =>
      role === "patient"
        ? b.patientAddress.toLowerCase() === lower
        : b.doctorAddress.toLowerCase() === lower,
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getBooking(id: string): DemoBooking | undefined {
  return bookings.get(id);
}

export function getBookingByConsultationId(
  consultationId: string,
): DemoBooking | undefined {
  return Array.from(bookings.values()).find(
    (b) => b.consultationId === consultationId,
  );
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus,
  extra?: { requestedRecordTypes?: string[] },
): DemoBooking | undefined {
  const b = bookings.get(id);
  if (!b) return undefined;
  b.status = status;
  if (extra?.requestedRecordTypes) {
    b.requestedRecordTypes = extra.requestedRecordTypes;
  }
  return b;
}

// --- Consents ---

export function addConsent(
  c: Omit<DemoConsent, "id" | "grantedAt" | "isActive">,
): DemoConsent {
  const id = `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const full: DemoConsent = { ...c, id, grantedAt: Date.now(), isActive: true };
  consents.set(id, full);
  return full;
}

export function getConsents(address: string): DemoConsent[] {
  const lower = address.toLowerCase();
  const now = Date.now();
  return Array.from(consents.values()).filter(
    (c) =>
      c.patientAddress.toLowerCase() === lower &&
      c.isActive &&
      now < c.expiresAt,
  );
}

export function revokeConsent(id: string): boolean {
  const c = consents.get(id);
  if (!c) return false;
  c.isActive = false;
  return true;
}

export function getConsentsForDoctor(doctorAddress: string): DemoConsent[] {
  const lower = doctorAddress.toLowerCase();
  const now = Date.now();
  return Array.from(consents.values()).filter(
    (c) =>
      c.doctorAddress.toLowerCase() === lower &&
      c.isActive &&
      now < c.expiresAt,
  );
}

// --- Access Logs ---

export function addAccessLog(log: Omit<DemoAccessLog, "id">): DemoAccessLog {
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const full: DemoAccessLog = { ...log, id };
  accessLogs.push(full);
  return full;
}

export function getAccessLogs(address: string): DemoAccessLog[] {
  const lower = address.toLowerCase();
  return accessLogs
    .filter((l) => l.patientAddress.toLowerCase() === lower)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// --- Consultation Results ---

export function setConsultationResult(result: DemoConsultationResult): void {
  consultationResults.set(result.consultationId, result);
}

export function getConsultationResult(
  consultationId: string,
): DemoConsultationResult | undefined {
  return consultationResults.get(consultationId);
}

// --- Data Sharing Opt-In ---

export function optInDataSharing(address: string): void {
  optedInAddresses.add(address.toLowerCase());
}

export function isOptedIn(address: string): boolean {
  return optedInAddresses.has(address.toLowerCase());
}

export function getAllRecords(): DemoRecord[] {
  return [...records];
}

export function getOptedInRecords(): DemoRecord[] {
  return records.filter((r) =>
    optedInAddresses.has(r.patientAddress.toLowerCase()),
  );
}
