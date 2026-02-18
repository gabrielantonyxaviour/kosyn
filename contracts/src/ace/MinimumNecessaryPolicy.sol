// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPolicy.sol";
import "../PatientConsent.sol";

/**
 * @title MinimumNecessaryPolicy
 * @notice HIPAA §164.514(d) — Minimum Necessary Standard.
 *
 * Enforces that a provider can only access the specific record type they
 * have consent for. If consent was granted for recordType=1 (vitals) but
 * the CRE report requests recordType=3 (imaging), access is blocked.
 *
 * This prevents "scope creep" where a provider with any consent could
 * access all of a patient's records.
 *
 * Operation byte 0x01 = record access request.
 * Report encoding: [op(1)] + abi.encode(provider, patient, recordType, duration)
 */
contract MinimumNecessaryPolicy is IPolicy {
    PatientConsent public immutable patientConsent;

    // recordType 0xFF = all record types (emergency access override)
    uint8 public constant ALL_RECORD_TYPES = 0xFF;

    event MinimumNecessaryChecked(
        address indexed provider,
        address indexed patient,
        uint8 requestedType,
        uint8 consentedType,
        bool passed
    );

    constructor(address _patientConsent) {
        patientConsent = PatientConsent(_patientConsent);
    }

    function check(address, bytes calldata data) external returns (bool) {
        uint8 operation = uint8(data[0]);

        // Only enforce on record-access operations (0x01)
        if (operation != 0x01) return true;

        (address provider, address patient, uint8 requestedRecordType,) =
            abi.decode(data[1:], (address, address, uint8, uint256));

        (uint8 consentedRecordType,,,) = patientConsent.consents(patient, provider);

        // Pass if: consent covers all types, OR exact type match
        bool passed = consentedRecordType == ALL_RECORD_TYPES ||
                      consentedRecordType == requestedRecordType;

        emit MinimumNecessaryChecked(
            provider,
            patient,
            requestedRecordType,
            consentedRecordType,
            passed
        );

        return passed;
    }
}
