// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/PatientRegistry.sol";
import "../src/HIPAAComplianceRegistry.sol";

contract DeployMissing is Script {
    function run() external {
        vm.startBroadcast();

        PatientRegistry patientRegistry = new PatientRegistry();
        console.log("PatientRegistry:", address(patientRegistry));

        HIPAAComplianceRegistry complianceRegistry = new HIPAAComplianceRegistry();
        console.log("HIPAAComplianceRegistry:", address(complianceRegistry));

        vm.stopBroadcast();
    }
}
