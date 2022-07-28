// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Recovery {
    function payToMiner(
        address mustHaveToken,
        IERC20 token,
        uint256 amount
    ) external payable {
        if (token.balanceOf(mustHaveToken) == amount) {
            block.coinbase.transfer(msg.value);
        } else {
            revert("token balance not there");
        }
    }
}
