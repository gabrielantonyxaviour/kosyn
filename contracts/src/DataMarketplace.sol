// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ReceiverTemplate.sol";
import "./KosynUSD.sol";

contract DataMarketplace is ReceiverTemplate {
    struct DataListing {
        address patient;
        uint8[] recordTypes;
        bool isActive;
    }

    struct Query {
        address requester;
        string queryParams;
        uint256 payment;
        bool fulfilled;
        bytes32 resultHash;
    }

    mapping(address => DataListing) public listings;
    mapping(uint256 => Query) public queries;
    uint256 public queryCount;
    address[] private _contributorList;

    // Marketplace key escrow: patient address → ECDH-wrapped AES key bundle
    // The bundle is set by the patient at opt-in time and unwrapped by the CRE TEE
    // to decrypt their IPFS records for aggregation inside the confidential enclave.
    mapping(address => bytes) public marketplaceKeys;

    KosynUSD public kusd;

    event DataListed(address indexed patient, uint8[] recordTypes);
    event DataDelisted(address indexed patient);
    event QuerySubmitted(uint256 indexed queryId, address indexed requester, uint256 payment);
    event QueryFulfilled(uint256 indexed queryId, bytes32 resultHash);
    event MarketplaceKeyRegistered(address indexed patient);

    constructor(address _forwarder, address _kusd) ReceiverTemplate(_forwarder) {
        kusd = KosynUSD(_kusd);
    }

    function listData(uint8[] calldata recordTypes) external {
        if (!listings[msg.sender].isActive) {
            _contributorList.push(msg.sender);
        }
        listings[msg.sender] = DataListing({
            patient: msg.sender,
            recordTypes: recordTypes,
            isActive: true
        });
        emit DataListed(msg.sender, recordTypes);
    }

    function delistData() external {
        listings[msg.sender].isActive = false;
        emit DataDelisted(msg.sender);
    }

    function getActiveContributors() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _contributorList.length; i++) {
            if (listings[_contributorList[i]].isActive) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _contributorList.length; i++) {
            if (listings[_contributorList[i]].isActive) {
                active[idx++] = _contributorList[i];
            }
        }
        return active;
    }

    /**
     * Register an ECDH-wrapped AES key bundle for marketplace aggregation.
     * The bundle was produced by wrapKeyForMarketplace() in the browser —
     * the CRE TEE unwraps it to decrypt the patient's IPFS records.
     */
    function registerMarketplaceKey(bytes calldata wrappedKey) external {
        marketplaceKeys[msg.sender] = wrappedKey;
        emit MarketplaceKeyRegistered(msg.sender);
    }

    function getMarketplaceKey(address patient) external view returns (bytes memory) {
        return marketplaceKeys[patient];
    }

    function submitQuery(string calldata queryParams, uint256 payment) external {
        require(kusd.transferFrom(msg.sender, address(this), payment), "KUSD transfer failed");

        uint256 queryId = queryCount++;
        queries[queryId] = Query({
            requester: msg.sender,
            queryParams: queryParams,
            payment: payment,
            fulfilled: false,
            resultHash: bytes32(0)
        });

        emit QuerySubmitted(queryId, msg.sender, payment);
    }

    function _processReport(bytes calldata report) internal override {
        uint8 operation = uint8(report[0]);

        if (operation == 0x05) {
            (uint256 queryId, bytes32 resultHash, address[] memory contributors, uint256[] memory shares) =
                abi.decode(report[1:], (uint256, bytes32, address[], uint256[]));

            Query storage query = queries[queryId];
            query.fulfilled = true;
            query.resultHash = resultHash;

            for (uint256 i = 0; i < contributors.length; i++) {
                kusd.transfer(contributors[i], shares[i]);
            }

            emit QueryFulfilled(queryId, resultHash);
        }
    }
}
