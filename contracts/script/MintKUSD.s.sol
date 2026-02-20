// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/KosynUSD.sol";

contract MintKUSD is Script {
    function run() external {
        address kusd = vm.envAddress("KUSD_ADDRESS");
        address recipient = vm.envAddress("RECIPIENT");
        uint256 amount = vm.envUint("AMOUNT"); // in KUSD base units (6 decimals)

        bytes32 paymentId = keccak256(abi.encodePacked("test-mint-", block.timestamp, recipient));

        bytes memory report = abi.encodePacked(
            uint8(0x04),
            abi.encode(recipient, amount, paymentId)
        );

        vm.startBroadcast();
        KosynUSD(kusd).onReport("test", report);
        vm.stopBroadcast();

        console.log("Minted", amount, "KUSD to", recipient);
        console.log("New balance:", KosynUSD(kusd).balanceOf(recipient));
    }
}
