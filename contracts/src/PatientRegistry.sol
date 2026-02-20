// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PatientRegistry
 * @notice On-chain registry for Kosyn patient identities.
 *
 * Personal data is AES-256-GCM encrypted client-side with the patient's
 * device passkey (WebAuthn PRF). Only the IPFS CID of the encrypted blob
 * and a SHA-256 integrity hash are stored on-chain. Kosyn cannot read
 * any plaintext personal data.
 *
 * DID: did:pkh:eip155:43113:{address} — derived from wallet, no central issuer.
 */
contract PatientRegistry {
    struct PatientProfile {
        string profileCid;   // IPFS CID of AES-256-GCM encrypted profile blob
        bytes32 profileHash; // SHA-256 of the encrypted blob (integrity check)
        uint256 registeredAt;
    }

    mapping(address => PatientProfile) private _profiles;
    address[] private _patients;

    event PatientRegistered(address indexed patient, string profileCid, uint256 timestamp);
    event ProfileUpdated(address indexed patient, string newProfileCid);

    function register(string calldata profileCid, bytes32 profileHash) external {
        require(_profiles[msg.sender].registeredAt == 0, "PatientRegistry: already registered");
        require(bytes(profileCid).length > 0, "PatientRegistry: empty CID");

        _profiles[msg.sender] = PatientProfile({
            profileCid: profileCid,
            profileHash: profileHash,
            registeredAt: block.timestamp
        });
        _patients.push(msg.sender);

        emit PatientRegistered(msg.sender, profileCid, block.timestamp);
    }

    function updateProfile(string calldata profileCid, bytes32 profileHash) external {
        require(_profiles[msg.sender].registeredAt != 0, "PatientRegistry: not registered");
        require(bytes(profileCid).length > 0, "PatientRegistry: empty CID");

        _profiles[msg.sender].profileCid = profileCid;
        _profiles[msg.sender].profileHash = profileHash;

        emit ProfileUpdated(msg.sender, profileCid);
    }

    function isRegistered(address addr) external view returns (bool) {
        return _profiles[addr].registeredAt != 0;
    }

    function getProfile(address addr) external view returns (PatientProfile memory) {
        return _profiles[addr];
    }

    function getPatientCount() external view returns (uint256) {
        return _patients.length;
    }
}
