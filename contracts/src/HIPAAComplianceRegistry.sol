// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HIPAAComplianceRegistry
 * @notice On-chain attestation layer for HIPAA Technical Safeguards (45 CFR §164.312).
 *
 * Every time a CRE report passes the PolicyEngine, the HealthRecordRegistry
 * calls this contract to record a ComplianceAttestation. This makes HIPAA
 * compliance cryptographically verifiable — any auditor can query the blockchain
 * to see that every access passed all required policies.
 *
 * Safeguards attested per access:
 *   ACCESS_CONTROL  — provider registered + patient consent active (§164.312(a)(1))
 *   CONSENT_EXPIRY  — consent window not expired (§164.312(a)(1))
 *   MIN_NECESSARY   — only requested record type, no scope creep (§164.514(d))
 *   AUDIT_TRAIL     — every access emits a verifiable log (§164.312(b))
 *
 * Architecture note: This contract follows the Chainlink ACE (Automated Compliance
 * Engine) pattern — a composable, policy-based compliance registry that is
 * chain-agnostic and jurisdiction-configurable.
 */
contract HIPAAComplianceRegistry {
    // Bitmask flags for which safeguards were verified
    uint8 public constant SAFEGUARD_ACCESS_CONTROL = 0x01; // §164.312(a)(1)
    uint8 public constant SAFEGUARD_CONSENT_EXPIRY  = 0x02; // §164.312(a)(1)
    uint8 public constant SAFEGUARD_MIN_NECESSARY   = 0x04; // §164.514(d)
    uint8 public constant SAFEGUARD_AUDIT_TRAIL     = 0x08; // §164.312(b)

    struct ComplianceAttestation {
        address accessor;      // provider or CRE node
        address patient;       // data subject
        uint8   recordType;    // which type of PHI was accessed
        uint8   safeguardsMet; // bitmask of SAFEGUARD_* flags
        uint256 timestamp;     // block.timestamp
        bytes32 reportHash;    // keccak256 of the CRE report (tamper-evident)
        bool    passed;        // true = all required policies passed
    }

    // attestationId → attestation
    mapping(uint256 => ComplianceAttestation) public attestations;
    // patient → all their attestation IDs (for HIPAA audit requests)
    mapping(address => uint256[]) public patientAttestations;
    uint256 public attestationCount;

    // Only authorized registrars (HealthRecordRegistry + PolicyEngine) can write
    mapping(address => bool) public authorizedRegistrars;
    address public owner;

    error Unauthorized();
    error InvalidReport();

    event ComplianceAttested(
        uint256 indexed attestationId,
        address indexed accessor,
        address indexed patient,
        uint8   recordType,
        uint8   safeguardsMet,
        bool    passed,
        bytes32 reportHash
    );

    event RegistrarUpdated(address registrar, bool authorized);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRegistrar() {
        if (!authorizedRegistrars[msg.sender]) revert Unauthorized();
        _;
    }

    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        authorizedRegistrars[registrar] = authorized;
        emit RegistrarUpdated(registrar, authorized);
    }

    /**
     * @notice Record a HIPAA compliance attestation for a data access event.
     * @dev Called by HealthRecordRegistry after PolicyEngine.evaluate() returns.
     * @param accessor   The provider address attempting access.
     * @param patient    The patient whose PHI is being accessed.
     * @param recordType The record type requested (minimum necessary check).
     * @param safeguardsMet Bitmask of which HIPAA safeguards were verified.
     * @param passed     Whether all required policies passed.
     * @param reportHash keccak256 of the raw CRE report bytes (tamper-evident).
     */
    function attest(
        address accessor,
        address patient,
        uint8   recordType,
        uint8   safeguardsMet,
        bool    passed,
        bytes32 reportHash
    ) external onlyRegistrar returns (uint256 attestationId) {
        attestationId = attestationCount++;

        attestations[attestationId] = ComplianceAttestation({
            accessor:      accessor,
            patient:       patient,
            recordType:    recordType,
            safeguardsMet: safeguardsMet,
            timestamp:     block.timestamp,
            reportHash:    reportHash,
            passed:        passed
        });

        patientAttestations[patient].push(attestationId);

        emit ComplianceAttested(
            attestationId,
            accessor,
            patient,
            recordType,
            safeguardsMet,
            passed,
            reportHash
        );
    }

    /**
     * @notice Returns all attestation IDs for a patient (HIPAA audit request).
     */
    function getPatientAttestations(address patient)
        external
        view
        returns (uint256[] memory)
    {
        return patientAttestations[patient];
    }

    /**
     * @notice Returns a single attestation record.
     */
    function getAttestation(uint256 attestationId)
        external
        view
        returns (ComplianceAttestation memory)
    {
        return attestations[attestationId];
    }

    /**
     * @notice Check if ALL required HIPAA safeguards are present in a bitmask.
     * Required: ACCESS_CONTROL | CONSENT_EXPIRY | MIN_NECESSARY | AUDIT_TRAIL
     */
    function isFullyCompliant(uint8 safeguardsMet) external pure returns (bool) {
        uint8 required = SAFEGUARD_ACCESS_CONTROL |
                         SAFEGUARD_CONSENT_EXPIRY  |
                         SAFEGUARD_MIN_NECESSARY   |
                         SAFEGUARD_AUDIT_TRAIL;
        return (safeguardsMet & required) == required;
    }
}
