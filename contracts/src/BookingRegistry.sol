// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BookingRegistry {
    enum Status { Booked, AccessRequested, AccessGranted, InSession, Completed }

    struct Booking {
        address patient;
        address doctor;
        uint256 fee;
        Status status;
        string metadataCid;
        string resultCid;
        uint8[] requestedRecordTypes;
        uint256 createdAt;
        uint256 completedAt;
    }

    IERC20 public kusd;
    mapping(uint256 => Booking) public bookings;
    mapping(address => uint256[]) public patientBookings;
    mapping(address => uint256[]) public doctorBookings;
    uint256 public bookingCount;

    event BookingCreated(uint256 indexed id, address indexed patient, address indexed doctor, uint256 fee, string metadataCid);
    event StatusUpdated(uint256 indexed id, Status status);
    event RecordTypesRequested(uint256 indexed id, uint8[] types);
    event ConsultationCompleted(uint256 indexed id, string resultCid);

    constructor(address _kusd) {
        kusd = IERC20(_kusd);
    }

    function createBooking(address doctor, uint256 fee, string calldata metadataCid) external {
        require(kusd.transferFrom(msg.sender, doctor, fee), "KUSD transfer failed");

        uint256 id = bookingCount++;
        Booking storage b = bookings[id];
        b.patient = msg.sender;
        b.doctor = doctor;
        b.fee = fee;
        b.status = Status.Booked;
        b.metadataCid = metadataCid;
        b.createdAt = block.timestamp;

        patientBookings[msg.sender].push(id);
        doctorBookings[doctor].push(id);

        emit BookingCreated(id, msg.sender, doctor, fee, metadataCid);
    }

    function updateStatus(uint256 id, Status status) external {
        Booking storage b = bookings[id];
        require(msg.sender == b.patient || msg.sender == b.doctor, "Not authorized");
        b.status = status;
        emit StatusUpdated(id, status);
    }

    function setRequestedRecordTypes(uint256 id, uint8[] calldata types) external {
        Booking storage b = bookings[id];
        require(msg.sender == b.doctor, "Only doctor");
        b.requestedRecordTypes = types;
        b.status = Status.AccessRequested;
        emit RecordTypesRequested(id, types);
        emit StatusUpdated(id, Status.AccessRequested);
    }

    function completeConsultation(uint256 id, string calldata resultCid) external {
        Booking storage b = bookings[id];
        require(msg.sender == b.doctor, "Only doctor");
        b.resultCid = resultCid;
        b.status = Status.Completed;
        b.completedAt = block.timestamp;
        emit ConsultationCompleted(id, resultCid);
        emit StatusUpdated(id, Status.Completed);
    }

    function getPatientBookings(address patient) external view returns (uint256[] memory) {
        return patientBookings[patient];
    }

    function getDoctorBookings(address doctor) external view returns (uint256[] memory) {
        return doctorBookings[doctor];
    }

    function getBooking(uint256 id) external view returns (Booking memory) {
        return bookings[id];
    }
}
