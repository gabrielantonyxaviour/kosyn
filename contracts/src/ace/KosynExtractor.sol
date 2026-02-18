// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IExtractor.sol";

contract KosynExtractor is IExtractor {
    function extract(bytes calldata report) external pure returns (uint8 operation, bytes memory params) {
        operation = uint8(report[0]);
        params = report[1:];
    }
}
