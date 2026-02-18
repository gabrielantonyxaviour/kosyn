// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPolicyEngine.sol";
import "../interfaces/IExtractor.sol";
import "../interfaces/IPolicy.sol";

contract PolicyEngine is IPolicyEngine {
    IExtractor public immutable extractor;
    IPolicy[] public policies;

    constructor(address _extractor, address[] memory _policies) {
        extractor = IExtractor(_extractor);
        for (uint256 i = 0; i < _policies.length; i++) {
            policies.push(IPolicy(_policies[i]));
        }
    }

    function evaluate(address caller, bytes calldata data) external returns (bool) {
        extractor.extract(data);

        for (uint256 i = 0; i < policies.length; i++) {
            if (!policies[i].check(caller, data)) {
                return false;
            }
        }

        return true;
    }
}
