// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ReceiverTemplate.sol";
import "./interfaces/IPolicyEngine.sol";
import "./HIPAAComplianceRegistry.sol";

contract HealthRecordRegistry is ReceiverTemplate {
    struct HealthRecord {
        string ipfsCid;
        uint8 recordType;
        uint256 uploadTimestamp;
        uint256 lastAccessedAt;
        bool isActive;
        address patient;
    }

    struct AccessLog {
        address provider;
        uint256 timestamp;
        bytes32 aiReportHash;
        bool granted;
    }

    // HIPAA safeguard bitmask constants (mirrors HIPAAComplianceRegistry)
    uint8 private constant SAFEGUARD_ACCESS_CONTROL = 0x01;
    uint8 private constant SAFEGUARD_CONSENT_EXPIRY  = 0x02;
    uint8 private constant SAFEGUARD_MIN_NECESSARY   = 0x04;
    uint8 private constant SAFEGUARD_AUDIT_TRAIL     = 0x08;

    mapping(uint256 => HealthRecord) public records;
    mapping(address => uint256[]) public patientRecords;
    mapping(uint256 => AccessLog[]) public recordAccessLogs;
    uint256 public recordCount;

    IPolicyEngine public policyEngine;
    HIPAAComplianceRegistry public complianceRegistry;

    event RecordUploaded(uint256 indexed recordId, address indexed patient, uint8 recordType, string ipfsCid);
    event AccessGranted(uint256 indexed recordId, address indexed provider, address indexed patient, bytes32 aiReportHash);
    event AccessDenied(address indexed provider, address indexed patient, string reason);

    constructor(address _forwarder, address _policyEngine, address _complianceRegistry)
        ReceiverTemplate(_forwarder)
    {
        policyEngine = IPolicyEngine(_policyEngine);
        complianceRegistry = HIPAAComplianceRegistry(_complianceRegistry);
    }

    function _processReport(bytes calldata report) internal override {
        uint8 operation = uint8(report[0]);

        if (operation == 0x00) {
            (string memory ipfsCid, uint8 recordType, uint256 timestamp, address patient) =
                abi.decode(report[1:], (string, uint8, uint256, address));
            _handleRecordUpload(ipfsCid, recordType, timestamp, patient);
        } else if (operation == 0x01) {
            (address provider, address patient, uint8 recordType, uint256 duration, bytes32 aiReportHash) =
                abi.decode(report[1:], (address, address, uint8, uint256, bytes32));

            bool passed = policyEngine.evaluate(msg.sender, report);

            // Attest compliance regardless of outcome — HIPAA §164.312(b) requires
            // audit records of both granted and denied access attempts
            uint8 safeguardsMet = SAFEGUARD_AUDIT_TRAIL;
            if (passed) {
                // All policies in the engine passed — mark all safeguards verified
                safeguardsMet |= SAFEGUARD_ACCESS_CONTROL
                              |  SAFEGUARD_CONSENT_EXPIRY
                              |  SAFEGUARD_MIN_NECESSARY;
            }
            complianceRegistry.attest(
                provider,
                patient,
                recordType,
                safeguardsMet,
                passed,
                keccak256(report)
            );

            if (passed) {
                _handleAccessGrant(provider, patient, recordType, duration, aiReportHash);
            } else {
                _handleAccessDenial(provider, patient, "Policy check failed");
            }
        } else if (operation == 0x02) {
            (address provider, address patient, string memory reason) =
                abi.decode(report[1:], (address, address, string));
            _handleAccessDenial(provider, patient, reason);
        }
    }

    function _handleRecordUpload(string memory ipfsCid, uint8 recordType, uint256 timestamp, address patient) internal {
        uint256 recordId = recordCount++;

        records[recordId] = HealthRecord({
            ipfsCid: ipfsCid,
            recordType: recordType,
            uploadTimestamp: timestamp,
            lastAccessedAt: 0,
            isActive: true,
            patient: patient
        });

        patientRecords[patient].push(recordId);
        emit RecordUploaded(recordId, patient, recordType, ipfsCid);
    }

    function _handleAccessGrant(
        address provider,
        address patient,
        uint8 recordType,
        uint256,
        bytes32 aiReportHash
    ) internal {
        uint256[] memory ids = patientRecords[patient];
        for (uint256 i = 0; i < ids.length; i++) {
            if (records[ids[i]].recordType == recordType && records[ids[i]].isActive) {
                records[ids[i]].lastAccessedAt = block.timestamp;
                recordAccessLogs[ids[i]].push(AccessLog({
                    provider: provider,
                    timestamp: block.timestamp,
                    aiReportHash: aiReportHash,
                    granted: true
                }));
                emit AccessGranted(ids[i], provider, patient, aiReportHash);
            }
        }
    }

    function _handleAccessDenial(address provider, address patient, string memory reason) internal {
        emit AccessDenied(provider, patient, reason);
    }

    function getPatientRecords(address patient) external view returns (uint256[] memory) {
        return patientRecords[patient];
    }

    function getRecord(uint256 recordId) external view returns (HealthRecord memory) {
        return records[recordId];
    }

    function getAccessLogs(uint256 recordId) external view returns (AccessLog[] memory) {
        return recordAccessLogs[recordId];
    }
}
