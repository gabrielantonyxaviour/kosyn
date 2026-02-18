// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IExtractor {
    function extract(bytes calldata report) external pure returns (uint8 operation, bytes memory params);
}
