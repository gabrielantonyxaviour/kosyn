// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract EventEmitter {
    event QuerySubmitted(uint256 indexed queryId, address indexed requester, uint256 payment);

    function emitQuery(uint256 queryId, uint256 payment) external {
        emit QuerySubmitted(queryId, msg.sender, payment);
    }
}

contract EmitTestEvent is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        EventEmitter emitter = new EventEmitter();
        emitter.emitQuery(1, 100 * 1e6);

        vm.stopBroadcast();
        console.log("EventEmitter deployed at:", address(emitter));
    }
}
