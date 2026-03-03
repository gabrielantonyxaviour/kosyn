import { NextRequest, NextResponse } from "next/server";
import {
  addDoctor,
  getDoctors,
  addRecord,
  getRecords,
  addBooking,
  getBookings,
  getBooking,
  getBookingByConsultationId,
  updateBookingStatus,
  addConsent,
  getConsents,
  getConsentsForDoctor,
  revokeConsent,
  addAccessLog,
  getAccessLogs,
  setConsultationResult,
  getConsultationResult,
  optInDataSharing,
} from "./store";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");

    switch (action) {
      case "doctors":
        return json(getDoctors());

      case "records": {
        const address = req.nextUrl.searchParams.get("address");
        if (!address) return err("address required");
        return json(getRecords(address));
      }

      case "bookings": {
        const address = req.nextUrl.searchParams.get("address");
        const role = req.nextUrl.searchParams.get("role") as
          | "patient"
          | "doctor";
        if (!address || !role) return err("address and role required");
        return json(getBookings(address, role));
      }

      case "booking": {
        const id = req.nextUrl.searchParams.get("id");
        if (!id) return err("id required");
        const booking = getBooking(id) || getBookingByConsultationId(id);
        if (!booking) return err("booking not found", 404);
        return json(booking);
      }

      case "consents": {
        const address = req.nextUrl.searchParams.get("address");
        if (!address) return err("address required");
        return json(getConsents(address));
      }

      case "doctor-consents": {
        const address = req.nextUrl.searchParams.get("address");
        if (!address) return err("address required");
        return json(getConsentsForDoctor(address));
      }

      case "access-logs": {
        const address = req.nextUrl.searchParams.get("address");
        if (!address) return err("address required");
        return json(getAccessLogs(address));
      }

      case "consultation-result": {
        const id = req.nextUrl.searchParams.get("id");
        if (!id) return err("id required");
        const result = getConsultationResult(id);
        if (!result) return json(null);
        return json(result);
      }

      default:
        return err("unknown action");
    }
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case "register-doctor":
        return json(
          addDoctor({
            address: body.address,
            name: body.name,
            specialty: body.specialty,
            fee: body.fee,
            jurisdiction: body.jurisdiction,
          }),
        );

      case "create-record":
        return json(
          addRecord({
            patientAddress: body.patientAddress,
            recordType: body.recordType,
            templateType: body.templateType,
            label: body.label,
            ipfsCid: body.ipfsCid || `Qm${Date.now().toString(36)}`,
            txHash:
              body.txHash ||
              `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
            createdBy: body.createdBy || "patient",
            createdByAddress: body.createdByAddress,
            formData: body.formData,
          }),
        );

      case "create-booking":
        return json(
          addBooking({
            patientAddress: body.patientAddress,
            patientName: body.patientName,
            doctorAddress: body.doctorAddress,
            doctorName: body.doctorName,
            specialty: body.specialty,
            date: body.date,
            time: body.time,
            fee: body.fee,
          }),
        );

      case "update-booking": {
        const updated = updateBookingStatus(body.id, body.status, {
          requestedRecordTypes: body.requestedRecordTypes,
        });
        if (!updated) return err("booking not found", 404);
        return json(updated);
      }

      case "grant-consent":
        return json(
          addConsent({
            patientAddress: body.patientAddress,
            doctorAddress: body.doctorAddress,
            doctorName: body.doctorName,
            recordTypes: body.recordTypes,
            expiresAt: body.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
            bookingId: body.bookingId,
          }),
        );

      case "revoke-consent": {
        const ok = revokeConsent(body.id);
        if (!ok) return err("consent not found", 404);
        return json({ success: true });
      }

      case "access-log":
        return json(
          addAccessLog({
            patientAddress: body.patientAddress,
            accessorAddress: body.accessorAddress,
            accessorName: body.accessorName,
            action: body.action,
            timestamp: body.timestamp || Date.now(),
            hasAttestation: body.hasAttestation ?? true,
            consultationId: body.consultationId,
          }),
        );

      case "consultation-result":
        setConsultationResult({
          consultationId: body.consultationId,
          soapNote: body.soapNote,
          summary: body.summary,
          medicalCodes: body.medicalCodes,
          drugInteractions: body.drugInteractions,
          riskScores: body.riskScores,
          proof: body.proof,
          completedAt: body.completedAt || Date.now(),
        });
        return json({ success: true });

      case "opt-in-data-sharing": {
        if (!body.address) return err("address required");
        optInDataSharing(body.address);
        return json({ success: true });
      }

      default:
        return err("unknown action");
    }
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
}
