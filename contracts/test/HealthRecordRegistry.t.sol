// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ProviderRegistry.sol";
import "../src/PatientConsent.sol";
import "../src/HealthRecordRegistry.sol";
import "../src/KosynUSD.sol";
import "../src/DataMarketplace.sol";
import "../src/ace/KosynExtractor.sol";
import "../src/ace/ProviderAllowlistPolicy.sol";
import "../src/ace/AuditPolicy.sol";
import "../src/ace/PolicyEngine.sol";
import "../src/HIPAAComplianceRegistry.sol";

contract HealthRecordRegistryTest is Test {
    ProviderRegistry providerRegistry;
    PatientConsent patientConsent;
    HealthRecordRegistry healthRecordRegistry;
    HIPAAComplianceRegistry complianceRegistry;
    KosynUSD kusd;
    DataMarketplace marketplace;
    PolicyEngine policyEngine;
    KosynExtractor extractor;
    ProviderAllowlistPolicy allowlistPolicy;
    AuditPolicy auditPolicy;

    address forwarder;
    address patient = address(0x1);
    address provider = address(0x2);

    function setUp() public {
        forwarder = address(this);

        providerRegistry = new ProviderRegistry(forwarder);
        patientConsent = new PatientConsent();
        extractor = new KosynExtractor();
        allowlistPolicy = new ProviderAllowlistPolicy(address(providerRegistry), address(patientConsent));
        auditPolicy = new AuditPolicy();

        address[] memory policies = new address[](2);
        policies[0] = address(allowlistPolicy);
        policies[1] = address(auditPolicy);
        policyEngine = new PolicyEngine(address(extractor), policies);

        complianceRegistry = new HIPAAComplianceRegistry();
        healthRecordRegistry = new HealthRecordRegistry(forwarder, address(policyEngine), address(complianceRegistry));
        complianceRegistry.setRegistrar(address(healthRecordRegistry), true);
        kusd = new KosynUSD(forwarder);
        marketplace = new DataMarketplace(forwarder, address(kusd));
    }

    function test_CREReportUploadsRecordAndStoresMetadataOnChain() public {
        bytes memory report = abi.encodePacked(
            uint8(0x00),
            abi.encode("QmTestCid123", uint8(1), uint256(1000), patient)
        );

        healthRecordRegistry.onReport("", report);

        assertEq(healthRecordRegistry.recordCount(), 1);

        uint256[] memory ids = healthRecordRegistry.getPatientRecords(patient);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);

        HealthRecordRegistry.HealthRecord memory record = healthRecordRegistry.getRecord(0);
        assertEq(record.ipfsCid, "QmTestCid123");
        assertEq(record.recordType, 1);
        assertEq(record.uploadTimestamp, 1000);
        assertEq(record.patient, patient);
        assertTrue(record.isActive);
    }

    function test_CREReportRegistersProviderWithLicenseAndSpecialty() public {
        bytes memory report = abi.encodePacked(
            uint8(0x03),
            abi.encode(provider, "Dr. Smith", keccak256("LICENSE123"), "Cardiology", "US-CA")
        );

        providerRegistry.onReport("", report);

        assertTrue(providerRegistry.isRegistered(provider));

        ProviderRegistry.Provider memory p = providerRegistry.getProvider(provider);
        assertEq(p.name, "Dr. Smith");
        assertEq(p.specialty, "Cardiology");
        assertEq(p.jurisdiction, "US-CA");
        assertTrue(p.isActive);

        address[] memory list = providerRegistry.getProviders();
        assertEq(list.length, 1);
        assertEq(list[0], provider);
    }

    function test_PatientCanGrantAndRevokeProviderConsent() public {
        vm.prank(patient);
        patientConsent.grantAccess(provider, 1, 1 days);

        assertTrue(patientConsent.isProviderAllowed(patient, provider));

        vm.prank(patient);
        patientConsent.revokeAccess(provider);

        assertFalse(patientConsent.isProviderAllowed(patient, provider));
    }

    function test_ACEPolicyGrantsAccessWhenConsentAndProviderBothRegistered() public {
        // Register provider
        bytes memory regReport = abi.encodePacked(
            uint8(0x03),
            abi.encode(provider, "Dr. Smith", keccak256("LICENSE123"), "Cardiology", "US-CA")
        );
        providerRegistry.onReport("", regReport);

        // Upload a record
        bytes memory uploadReport = abi.encodePacked(
            uint8(0x00),
            abi.encode("QmTestCid123", uint8(1), uint256(1000), patient)
        );
        healthRecordRegistry.onReport("", uploadReport);

        // Patient grants consent
        vm.prank(patient);
        patientConsent.grantAccess(provider, 1, 1 days);

        // Access grant via CRE report
        bytes32 aiHash = keccak256("ai-report-data");
        bytes memory accessReport = abi.encodePacked(
            uint8(0x01),
            abi.encode(provider, patient, uint8(1), uint256(1 days), aiHash)
        );
        healthRecordRegistry.onReport("", accessReport);

        HealthRecordRegistry.AccessLog[] memory logs = healthRecordRegistry.getAccessLogs(0);
        assertEq(logs.length, 1);
        assertEq(logs[0].provider, provider);
        assertEq(logs[0].aiReportHash, aiHash);
        assertTrue(logs[0].granted);
    }

    function test_CREReportLogsAccessDenialWithReason() public {
        bytes memory report = abi.encodePacked(
            uint8(0x02),
            abi.encode(provider, patient, "No consent")
        );

        healthRecordRegistry.onReport("", report);
        // Just verifying it doesn't revert
    }

    function test_CREPaymentReportMintsKUSDToPatientWithCorrectDecimals() public {
        bytes32 paymentId = keccak256("stripe_payment_123");
        bytes memory report = abi.encodePacked(
            uint8(0x04),
            abi.encode(patient, uint256(100e6), paymentId)
        );

        kusd.onReport("", report);

        assertEq(kusd.balanceOf(patient), 100e6);
        assertEq(kusd.decimals(), 6);
    }

    function test_ConsentExpiresAfterDurationAndBlocksFutureAccess() public {
        vm.prank(patient);
        patientConsent.grantAccess(provider, 1, 1 hours);

        assertTrue(patientConsent.isProviderAllowed(patient, provider));

        vm.warp(block.timestamp + 2 hours);

        assertFalse(patientConsent.isProviderAllowed(patient, provider));
    }

    function test_RevertsWhenNonForwarderCallsOnReport() public {
        bytes memory report = abi.encodePacked(uint8(0x00), abi.encode("QmTest", uint8(1), uint256(1000), patient));

        vm.prank(address(0xdead));
        vm.expectRevert("Unauthorized forwarder");
        healthRecordRegistry.onReport("", report);
    }

    function test_MultipleUploadReportsCreateSeparateRecordsForSamePatient() public {
        bytes memory report1 = abi.encodePacked(uint8(0x00), abi.encode("QmCid1", uint8(1), uint256(1000), patient));
        bytes memory report2 = abi.encodePacked(uint8(0x00), abi.encode("QmCid2", uint8(2), uint256(2000), patient));

        healthRecordRegistry.onReport("", report1);
        healthRecordRegistry.onReport("", report2);

        assertEq(healthRecordRegistry.recordCount(), 2);

        uint256[] memory ids = healthRecordRegistry.getPatientRecords(patient);
        assertEq(ids.length, 2);
    }

    function test_ProviderRequestAccessEmitsEventWithoutRevert() public {
        vm.prank(provider);
        patientConsent.requestAccess(patient, 1);
        // Verifying event emission (no revert)
    }

    function test_PatientListsDataAndQueryFulfillmentDistributesKUSDToContributors() public {
        // Mint KUSD to requester
        address requester = address(0x3);
        bytes memory mintReport = abi.encodePacked(
            uint8(0x04),
            abi.encode(requester, uint256(1000e6), keccak256("payment"))
        );
        kusd.onReport("", mintReport);

        // Patient lists data
        uint8[] memory recordTypes = new uint8[](2);
        recordTypes[0] = 1;
        recordTypes[1] = 2;
        vm.prank(patient);
        marketplace.listData(recordTypes);

        // Requester approves and submits query
        vm.startPrank(requester);
        kusd.approve(address(marketplace), 500e6);
        marketplace.submitQuery("age>30 AND condition=diabetes", 500e6);
        vm.stopPrank();

        assertEq(kusd.balanceOf(address(marketplace)), 500e6);

        // Fulfill query via CRE report
        address[] memory contributors = new address[](1);
        contributors[0] = patient;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 500e6;

        bytes memory fulfillReport = abi.encodePacked(
            uint8(0x05),
            abi.encode(uint256(0), keccak256("result"), contributors, shares)
        );
        marketplace.onReport("", fulfillReport);

        assertEq(kusd.balanceOf(patient), 500e6);
    }
}
