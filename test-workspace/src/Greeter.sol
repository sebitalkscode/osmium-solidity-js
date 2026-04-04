// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Greeter {
    string private greeting;
    address public owner;

    event GreetingChanged(string oldGreeting, string newGreeting);

    constructor(string memory _greeting) {
        greeting = _greeting;
        owner = msg.sender;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        require(msg.sender == owner, "Only the owner can change the greeting.");
        string memory oldGreeting = greeting;
        greeting = _greeting;
        emit GreetingChanged(oldGreeting, _greeting);
    }

    // Deliberate bad formatting below to test the Osmium Auto-Formatter!
    function badlyFormattedFunction() public view returns (uint256) {
        return 42;
    }
}
