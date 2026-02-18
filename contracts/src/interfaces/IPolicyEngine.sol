// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPolicyEngine {
    function evaluate(address caller, bytes calldata data) external returns (bool);
}
