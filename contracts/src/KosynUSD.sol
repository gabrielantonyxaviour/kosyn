// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/ReceiverTemplate.sol";

contract KosynUSD is ERC20, ReceiverTemplate {
    event KUSDMinted(address indexed recipient, uint256 amount, bytes32 stripePaymentId);

    mapping(bytes32 => bool) public usedPaymentIds;

    constructor(address _forwarder) ERC20("Kosyn USD", "KUSD") ReceiverTemplate(_forwarder) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function _processReport(bytes calldata report) internal override {
        uint8 operation = uint8(report[0]);

        if (operation == 0x04) {
            (address recipient, uint256 amount, bytes32 stripePaymentId) =
                abi.decode(report[1:], (address, uint256, bytes32));
            require(!usedPaymentIds[stripePaymentId], "KosynUSD: payment already processed");
            usedPaymentIds[stripePaymentId] = true;
            _mint(recipient, amount);
            emit KUSDMinted(recipient, amount, stripePaymentId);
        }
    }
}
