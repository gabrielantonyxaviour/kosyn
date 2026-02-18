// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IReceiver.sol";

abstract contract ReceiverTemplate is IReceiver {
    address public immutable forwarder;

    constructor(address _forwarder) {
        forwarder = _forwarder;
    }

    function onReport(bytes calldata, bytes calldata report) external override {
        require(msg.sender == forwarder, "Unauthorized forwarder");
        _processReport(report);
    }

    function _processReport(bytes calldata report) internal virtual;
}
