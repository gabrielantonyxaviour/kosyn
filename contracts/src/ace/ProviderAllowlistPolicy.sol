// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPolicy.sol";
import "../ProviderRegistry.sol";
import "../PatientConsent.sol";

contract ProviderAllowlistPolicy is IPolicy {
    ProviderRegistry public immutable providerRegistry;
    PatientConsent public immutable patientConsent;

    constructor(address _providerRegistry, address _patientConsent) {
        providerRegistry = ProviderRegistry(_providerRegistry);
        patientConsent = PatientConsent(_patientConsent);
    }

    function check(address, bytes calldata data) external view returns (bool) {
        uint8 operation = uint8(data[0]);

        if (operation == 0x01) {
            (address provider, address patient,,) = abi.decode(data[1:], (address, address, uint8, uint256));
            return providerRegistry.isRegistered(provider) && patientConsent.isProviderAllowed(patient, provider);
        }

        return true;
    }
}
