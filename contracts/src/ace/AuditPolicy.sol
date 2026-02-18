// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPolicy.sol";

contract AuditPolicy is IPolicy {
    event AccessAudited(address indexed caller, uint8 operation, uint256 timestamp);

    function check(address caller, bytes calldata data) external returns (bool) {
        uint8 operation = uint8(data[0]);
        emit AccessAudited(caller, operation, block.timestamp);
        return true;
    }
}
