// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PatientConsent {
    struct ConsentGrant {
        uint8 recordType;
        uint256 grantedAt;
        uint256 expiresAt;
        bool isActive;
    }

    mapping(address => mapping(address => ConsentGrant)) public consents;
    mapping(address => address[]) public patientProviders;

    event AccessRequested(address indexed provider, address indexed patient, uint8 recordType);
    event ConsentUpdated(address indexed patient, address indexed provider, bool granted);
    event AccessGranted(address indexed patient, address indexed provider, uint8 recordType, uint256 duration);
    event AccessDenied(address indexed patient, address indexed provider);

    function grantAccess(address provider, uint8 recordType, uint256 duration) external {
        ConsentGrant storage consent = consents[msg.sender][provider];

        if (!consent.isActive) {
            patientProviders[msg.sender].push(provider);
        }

        consent.recordType = recordType;
        consent.grantedAt = block.timestamp;
        consent.expiresAt = block.timestamp + duration;
        consent.isActive = true;

        emit AccessGranted(msg.sender, provider, recordType, duration);
        emit ConsentUpdated(msg.sender, provider, true);
    }

    function revokeAccess(address provider) external {
        consents[msg.sender][provider].isActive = false;
        emit AccessDenied(msg.sender, provider);
        emit ConsentUpdated(msg.sender, provider, false);
    }

    function requestAccess(address patient, uint8 recordType) external {
        emit AccessRequested(msg.sender, patient, recordType);
    }

    function isProviderAllowed(address patient, address provider) external view returns (bool) {
        ConsentGrant memory consent = consents[patient][provider];
        return consent.isActive && block.timestamp < consent.expiresAt;
    }
}
