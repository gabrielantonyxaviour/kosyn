import { getContract, prepareContractCall, readContract } from "thirdweb";
import { getClient, chain } from "./thirdweb";

export const ADDRESSES = {
  healthRecordRegistry: (process.env.NEXT_PUBLIC_HEALTH_RECORD_REGISTRY ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  patientConsent: (process.env.NEXT_PUBLIC_PATIENT_CONSENT ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  providerRegistry: (process.env.NEXT_PUBLIC_PROVIDER_REGISTRY ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  kosynUSD: (process.env.NEXT_PUBLIC_KOSYNUSD ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  dataMarketplace: (process.env.NEXT_PUBLIC_DATA_MARKETPLACE ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  patientRegistry: (process.env.NEXT_PUBLIC_PATIENT_REGISTRY ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  hipaaComplianceRegistry: (process.env.NEXT_PUBLIC_HIPAA_COMPLIANCE_REGISTRY ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  bookingRegistry: (process.env.NEXT_PUBLIC_BOOKING_REGISTRY ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

// Simplified ABIs — only the functions we use
// Target chain: Avalanche Fuji (43113)
export const HEALTH_RECORD_REGISTRY_ABI = [
  {
    type: "function",
    name: "records",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "ipfsCid", type: "string" },
      { name: "recordType", type: "uint8" },
      { name: "uploadTimestamp", type: "uint256" },
      { name: "lastAccessedAt", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "patient", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recordCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPatientRecords",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRecord",
    inputs: [{ name: "recordId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "ipfsCid", type: "string" },
          { name: "recordType", type: "uint8" },
          { name: "uploadTimestamp", type: "uint256" },
          { name: "lastAccessedAt", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "patient", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAccessLogs",
    inputs: [{ name: "recordId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "provider", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "aiReportHash", type: "bytes32" },
          { name: "granted", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "forwarder",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "policyEngine",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

export const PATIENT_CONSENT_ABI = [
  {
    type: "function",
    name: "grantAccess",
    inputs: [
      { name: "provider", type: "address" },
      { name: "recordType", type: "uint8" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeAccess",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestAccess",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordType", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isProviderAllowed",
    inputs: [
      { name: "patient", type: "address" },
      { name: "provider", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consents",
    inputs: [
      { name: "patient", type: "address" },
      { name: "provider", type: "address" },
    ],
    outputs: [
      { name: "recordType", type: "uint8" },
      { name: "grantedAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AccessRequested",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "patient", type: "address", indexed: true },
      { name: "recordType", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ConsentUpdated",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "granted", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AccessGranted",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "recordType", type: "uint8", indexed: false },
      { name: "duration", type: "uint256", indexed: false },
    ],
  },
] as const;

export const PROVIDER_REGISTRY_ABI = [
  {
    type: "function",
    name: "providers",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "licenseHash", type: "bytes32" },
      { name: "specialty", type: "string" },
      { name: "jurisdiction", type: "string" },
      { name: "isActive", type: "bool" },
      { name: "registeredAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProviders",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProvider",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "licenseHash", type: "bytes32" },
          { name: "specialty", type: "string" },
          { name: "jurisdiction", type: "string" },
          { name: "isActive", type: "bool" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "forwarder",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

export const KOSYNUSD_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export const DATA_MARKETPLACE_ABI = [
  {
    type: "function",
    name: "listData",
    inputs: [{ name: "recordTypes", type: "uint8[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delistData",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "listings",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [
      { name: "patient", type: "address" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "submitQuery",
    inputs: [
      { name: "queryParams", type: "string" },
      { name: "payment", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "forwarder",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerMarketplaceKey",
    inputs: [{ name: "wrappedKey", type: "bytes" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMarketplaceKey",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveContributors",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
] as const;

export function getHealthRecordRegistry() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.healthRecordRegistry,
    abi: HEALTH_RECORD_REGISTRY_ABI,
  });
}

export function getPatientConsent() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.patientConsent,
    abi: PATIENT_CONSENT_ABI,
  });
}

export function getProviderRegistry() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.providerRegistry,
    abi: PROVIDER_REGISTRY_ABI,
  });
}

export function getKosynUSD() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.kosynUSD,
    abi: KOSYNUSD_ABI,
  });
}

export function getDataMarketplace() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.dataMarketplace,
    abi: DATA_MARKETPLACE_ABI,
  });
}

export const PATIENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "profileCid", type: "string" },
      { name: "profileHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateProfile",
    inputs: [
      { name: "profileCid", type: "string" },
      { name: "profileHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProfile",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "profileCid", type: "string" },
          { name: "profileHash", type: "bytes32" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPatientCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PatientRegistered",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "profileCid", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getPatientRegistry() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.patientRegistry,
    abi: PATIENT_REGISTRY_ABI,
  });
}

export const HIPAA_COMPLIANCE_REGISTRY_ABI = [
  {
    type: "function",
    name: "getPatientAttestations",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAttestation",
    inputs: [{ name: "attestationId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "accessor", type: "address" },
          { name: "patient", type: "address" },
          { name: "recordType", type: "uint8" },
          { name: "safeguardsMet", type: "uint8" },
          { name: "timestamp", type: "uint256" },
          { name: "reportHash", type: "bytes32" },
          { name: "passed", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isFullyCompliant",
    inputs: [{ name: "safeguardsMet", type: "uint8" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "attestationCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ComplianceAttested",
    inputs: [
      { name: "attestationId", type: "uint256", indexed: true },
      { name: "accessor", type: "address", indexed: true },
      { name: "patient", type: "address", indexed: true },
      { name: "recordType", type: "uint8", indexed: false },
      { name: "safeguardsMet", type: "uint8", indexed: false },
      { name: "passed", type: "bool", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export function getHIPAAComplianceRegistry() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.hipaaComplianceRegistry,
    abi: HIPAA_COMPLIANCE_REGISTRY_ABI,
  });
}

export const BOOKING_REGISTRY_ABI = [
  {
    type: "function",
    name: "createBooking",
    inputs: [
      { name: "doctor", type: "address" },
      { name: "fee", type: "uint256" },
      { name: "metadataCid", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateStatus",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setRequestedRecordTypes",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "types", type: "uint8[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "completeConsultation",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "resultCid", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBooking",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "patient", type: "address" },
          { name: "doctor", type: "address" },
          { name: "fee", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "metadataCid", type: "string" },
          { name: "resultCid", type: "string" },
          { name: "requestedRecordTypes", type: "uint8[]" },
          { name: "createdAt", type: "uint256" },
          { name: "completedAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPatientBookings",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDoctorBookings",
    inputs: [{ name: "doctor", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bookingCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BookingCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "patient", type: "address", indexed: true },
      { name: "doctor", type: "address", indexed: true },
      { name: "fee", type: "uint256", indexed: false },
      { name: "metadataCid", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StatusUpdated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ConsultationCompleted",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "resultCid", type: "string", indexed: false },
    ],
  },
] as const;

export function getBookingRegistry() {
  return getContract({
    client: getClient(),
    chain,
    address: ADDRESSES.bookingRegistry,
    abi: BOOKING_REGISTRY_ABI,
  });
}

export { prepareContractCall, readContract };
