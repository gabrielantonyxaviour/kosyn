// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ReceiverTemplate.sol";

contract ProviderRegistry is ReceiverTemplate {
    struct Provider {
        string name;
        bytes32 licenseHash;
        string specialty;
        string jurisdiction;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Provider) public providers;
    address[] public providerList;

    event ProviderRegistered(address indexed provider, string name, string specialty);
    event ProviderDeactivated(address indexed provider);

    constructor(address _forwarder) ReceiverTemplate(_forwarder) {}

    function _processReport(bytes calldata report) internal override {
        uint8 operation = uint8(report[0]);

        if (operation == 0x03) {
            (address provider, string memory name, bytes32 licenseHash, string memory specialty, string memory jurisdiction) =
                abi.decode(report[1:], (address, string, bytes32, string, string));

            providers[provider] = Provider({
                name: name,
                licenseHash: licenseHash,
                specialty: specialty,
                jurisdiction: jurisdiction,
                isActive: true,
                registeredAt: block.timestamp
            });

            providerList.push(provider);
            emit ProviderRegistered(provider, name, specialty);
        }
    }

    function isRegistered(address provider) external view returns (bool) {
        return providers[provider].isActive;
    }

    function getProviders() external view returns (address[] memory) {
        return providerList;
    }

    function getProvider(address provider) external view returns (Provider memory) {
        return providers[provider];
    }
}
