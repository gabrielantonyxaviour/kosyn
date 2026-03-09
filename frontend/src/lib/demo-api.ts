import type {
  DemoDoctor,
  DemoRecord,
  DemoBooking,
  DemoConsent,
  DemoAccessLog,
  DemoConsultationResult,
  BookingStatus,
} from "@/app/api/demo/store";

async function api<T>(
  action: string,
  opts?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  const url = new URL("/api/demo", window.location.origin);
  url.searchParams.set("action", action);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  return res.json();
}

// --- Doctors ---

export function registerDoctor(doc: Omit<DemoDoctor, "registeredAt">) {
  return api<DemoDoctor>("register-doctor", {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

export function getDoctors() {
  return api<DemoDoctor[]>("doctors");
}

// --- Records ---

export function createRecord(rec: {
  patientAddress: string;
  recordType: string;
  templateType: string;
  label: string;
  createdBy?: "patient" | "doctor";
  createdByAddress: string;
  formData?: Record<string, string>;
}) {
  return api<DemoRecord>("create-record", {
    method: "POST",
    body: JSON.stringify(rec),
  });
}

export function getRecords(address: string) {
  return api<DemoRecord[]>("records", { params: { address } });
}

// --- Bookings ---

export function createBooking(b: {
  patientAddress: string;
  patientName: string;
  doctorAddress: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  fee: number;
}) {
  return api<DemoBooking>("create-booking", {
    method: "POST",
    body: JSON.stringify(b),
  });
}

export function getBookings(address: string, role: "patient" | "doctor") {
  return api<DemoBooking[]>("bookings", { params: { address, role } });
}

export function getBooking(id: string) {
  return api<DemoBooking>("booking", { params: { id } });
}

export function updateBooking(
  id: string,
  status: BookingStatus,
  extra?: { requestedRecordTypes?: string[] },
) {
  return api<DemoBooking>("update-booking", {
    method: "POST",
    body: JSON.stringify({ id, status, ...extra }),
  });
}

// --- Consents ---

export function grantConsent(c: {
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  recordTypes: string[];
  expiresAt?: number;
  bookingId: string;
}) {
  return api<DemoConsent>("grant-consent", {
    method: "POST",
    body: JSON.stringify(c),
  });
}

export function getConsents(address: string) {
  return api<DemoConsent[]>("consents", { params: { address } });
}

export function getConsentsForDoctor(doctorAddress: string) {
  return api<DemoConsent[]>("doctor-consents", {
    params: { address: doctorAddress },
  });
}

export function revokeConsent(id: string) {
  return api<{ success: boolean }>("revoke-consent", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

// --- Access Logs ---

export function addAccessLog(log: {
  patientAddress: string;
  accessorAddress: string;
  accessorName: string;
  action: string;
  hasAttestation?: boolean;
  consultationId?: string;
}) {
  return api<DemoAccessLog>("access-log", {
    method: "POST",
    body: JSON.stringify(log),
  });
}

export function getAccessLogs(address: string) {
  return api<DemoAccessLog[]>("access-logs", { params: { address } });
}

// --- Consultation Results ---

export function saveConsultationResult(result: DemoConsultationResult) {
  return api<{ success: boolean }>("consultation-result", {
    method: "POST",
    body: JSON.stringify(result),
  });
}

export function getConsultationResult(id: string) {
  return api<DemoConsultationResult | null>("consultation-result", {
    params: { id },
  });
}
