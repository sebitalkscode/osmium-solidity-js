// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// This file deliberately contains many linting issues to verify the Osmium linter
contract LinterWarnings {
    // state-visibility: missing visibility specifier
    uint256 counter;

    // func-visibility: missing visibility
    function increment() external {
        counter++;
    }

    // avoid-tx-origin: tx.origin is dangerous
    function isOwner() public view returns (bool) {
        return tx.origin == address(this);
    }

    // reason-string: error message too long (>32 chars)
    function doSomethingImportant(uint256 amount) external {
        require(amount > 0, "The amount must be greater than zero to proceed");
    }

    // no-inline-assembly warning
    function getCodeSize(address addr) public view returns (uint256 size) {
        assembly {
            size := extcodesize(addr)
        }
    }
}
