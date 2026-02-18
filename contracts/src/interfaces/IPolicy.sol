// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPolicy {
    function check(address caller, bytes calldata data) external returns (bool);
}
