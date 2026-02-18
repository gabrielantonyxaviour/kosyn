// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPolicy.sol";
import "../PatientConsent.sol";

/**
 * @title ConsentExpiryPolicy
 * @notice HIPAA §164.312(a)(1) — Access Control.
 *
 * Enforces that provider consent has not expired at the time of access.
 * ProviderAllowlistPolicy checks isActive; this policy additionally enforces
 * the consent window (expiresAt) has not passed.
 *
 * Operation byte 0x01 = record access request.
 * Report encoding: [op(1)] + abi.encode(provider, patient, recordType, duration)
 */
contract ConsentExpiryPolicy is IPolicy {
    PatientConsent public immutable patientConsent;

    error ConsentExpired(address provider, address patient);
    error ConsentNotActive(address provider, address patient);

    event ConsentExpiryChecked(
        address indexed provider,
        address indexed patient,
        uint256 expiresAt,
        bool passed
    );

    constructor(address _patientConsent) {
        patientConsent = PatientConsent(_patientConsent);
    }

    function check(address, bytes calldata data) external returns (bool) {
        uint8 operation = uint8(data[0]);

        // Only enforce on record-access operations (0x01)
        if (operation != 0x01) return true;

        (address provider, address patient,,) =
            abi.decode(data[1:], (address, address, uint8, uint256));

        (uint8 recordType, uint256 grantedAt, uint256 expiresAt, bool isActive) =
            patientConsent.consents(patient, provider);
        // Suppress unused variable warnings
        (recordType, grantedAt);

        bool passed = isActive && block.timestamp < expiresAt;
        emit ConsentExpiryChecked(provider, patient, expiresAt, passed);

        return passed;
    }
}
