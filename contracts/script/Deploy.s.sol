// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ProviderRegistry.sol";
import "../src/PatientConsent.sol";
import "../src/HealthRecordRegistry.sol";
import "../src/KosynUSD.sol";
import "../src/DataMarketplace.sol";
import "../src/BookingRegistry.sol";
import "../src/PatientRegistry.sol";
import "../src/HIPAAComplianceRegistry.sol";
import "../src/ace/KosynExtractor.sol";
import "../src/ace/ProviderAllowlistPolicy.sol";
import "../src/ace/AuditPolicy.sol";
import "../src/ace/ConsentExpiryPolicy.sol";
import "../src/ace/MinimumNecessaryPolicy.sol";
import "../src/ace/PolicyEngine.sol";

contract Deploy is Script {
    function run() external {
        address forwarder = vm.envOr("CRE_FORWARDER_ADDRESS", address(1));

        vm.startBroadcast();

        // --- Core identity & consent ---
        ProviderRegistry providerRegistry = new ProviderRegistry(forwarder);
        console.log("ProviderRegistry:", address(providerRegistry));

        PatientConsent patientConsent = new PatientConsent();
        console.log("PatientConsent:", address(patientConsent));

        PatientRegistry patientRegistry = new PatientRegistry();
        console.log("PatientRegistry:", address(patientRegistry));

        // --- ACE: extractor + policies ---
        KosynExtractor extractor = new KosynExtractor();
        console.log("KosynExtractor:", address(extractor));

        ProviderAllowlistPolicy allowlistPolicy = new ProviderAllowlistPolicy(
            address(providerRegistry),
            address(patientConsent)
        );
        console.log("ProviderAllowlistPolicy:", address(allowlistPolicy));

        // HIPAA §164.312(a)(1): Consent expiry enforcement
        ConsentExpiryPolicy consentExpiryPolicy = new ConsentExpiryPolicy(
            address(patientConsent)
        );
        console.log("ConsentExpiryPolicy:", address(consentExpiryPolicy));

        // HIPAA §164.514(d): Minimum necessary standard
        MinimumNecessaryPolicy minimumNecessaryPolicy = new MinimumNecessaryPolicy(
            address(patientConsent)
        );
        console.log("MinimumNecessaryPolicy:", address(minimumNecessaryPolicy));

        AuditPolicy auditPolicy = new AuditPolicy();
        console.log("AuditPolicy:", address(auditPolicy));

        // --- PolicyEngine: compose all 4 HIPAA policies ---
        address[] memory policyAddresses = new address[](4);
        policyAddresses[0] = address(allowlistPolicy);
        policyAddresses[1] = address(consentExpiryPolicy);
        policyAddresses[2] = address(minimumNecessaryPolicy);
        policyAddresses[3] = address(auditPolicy);

        PolicyEngine policyEngine = new PolicyEngine(address(extractor), policyAddresses);
        console.log("PolicyEngine:", address(policyEngine));

        // --- HIPAA Compliance Registry (ACE-pattern attestation layer) ---
        HIPAAComplianceRegistry complianceRegistry = new HIPAAComplianceRegistry();
        console.log("HIPAAComplianceRegistry:", address(complianceRegistry));

        // HealthRecordRegistry is the only authorized registrar
        HealthRecordRegistry healthRecordRegistry = new HealthRecordRegistry(
            forwarder,
            address(policyEngine),
            address(complianceRegistry)
        );
        console.log("HealthRecordRegistry:", address(healthRecordRegistry));

        // Authorize HealthRecordRegistry to write attestations
        complianceRegistry.setRegistrar(address(healthRecordRegistry), true);
        console.log("Registrar authorized: HealthRecordRegistry");

        // --- Payments ---
        KosynUSD kusd = new KosynUSD(forwarder);
        console.log("KosynUSD:", address(kusd));

        DataMarketplace marketplace = new DataMarketplace(forwarder, address(kusd));
        console.log("DataMarketplace:", address(marketplace));

        // --- Bookings ---
        BookingRegistry bookingRegistry = new BookingRegistry(address(kusd));
        console.log("BookingRegistry:", address(bookingRegistry));

        vm.stopBroadcast();
    }
}
