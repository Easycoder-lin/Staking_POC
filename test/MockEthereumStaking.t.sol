// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockEthereumStaking} from "../src/MockEthereumStaking.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
}

contract MinimalTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 actual, uint256 expected) internal pure {
        require(actual == expected, "uint mismatch");
    }

    function assertEq(address actual, address expected) internal pure {
        require(actual == expected, "address mismatch");
    }

    function assertTrue(bool value) internal pure {
        require(value, "bool not true");
    }
}

contract MockEthereumStakingTest is MinimalTest {
    MockEthereumStaking internal staking;

    address internal constant USER = address(0xA11CE);
    address internal constant WITHDRAWAL = address(0xB0B);
    address internal constant NON_OWNER = address(0xCAFE);

    function setUp() public {
        staking = new MockEthereumStaking();
        vm.deal(USER, 100 ether);
        vm.deal(WITHDRAWAL, 1 ether);
        vm.deal(address(this), 100 ether);
    }

    function testStakeCreatesPendingValidator() public {
        uint256 activationEpoch = staking.currentEpoch() + staking.ACTIVATION_DELAY();

        vm.prank(USER);
        uint256 validatorId = staking.stake{value: 0.032 ether}(WITHDRAWAL);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.PendingActivation));
        assertEq(validator.owner, USER);
        assertEq(validator.withdrawalAddress, WITHDRAWAL);
        assertEq(validator.balance, 0.032 ether);
        assertEq(validator.activationEpoch, activationEpoch);
    }

    function testCannotStakeWithWrongAmount() public {
        vm.expectRevert(MockEthereumStaking.InvalidStakeAmount.selector);
        vm.prank(USER);
        staking.stake{value: 0.031 ether}(WITHDRAWAL);
    }

    function testCannotStakeWithZeroWithdrawalAddress() public {
        vm.expectRevert(MockEthereumStaking.ZeroWithdrawalAddress.selector);
        vm.prank(USER);
        staking.stake{value: 0.032 ether}(address(0));
    }

    function testCanActivateAfterActivationDelay() public {
        uint256 validatorId = _stake();

        staking.advanceEpoch(staking.ACTIVATION_DELAY());
        staking.activateValidator(validatorId);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.Active));
    }

    function testCannotActivateTooEarly() public {
        uint256 validatorId = _stake();

        vm.expectRevert(abi.encodeWithSelector(MockEthereumStaking.ActivationEpochNotReached.selector, 0, 2));
        staking.activateValidator(validatorId);
    }

    function testRewardIncreasesBalance() public {
        uint256 validatorId = _stakeAndActivate();

        staking.simulateReward{value: 0.002 ether}(validatorId, 0.002 ether);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(validator.balance, 0.034 ether);
    }

    function testPenaltyDecreasesBalance() public {
        uint256 validatorId = _stakeAndActivate();

        staking.simulatePenalty(validatorId, 0.003 ether);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(validator.balance, 0.029 ether);
    }

    function testOwnerCanRequestExit() public {
        uint256 validatorId = _stakeAndActivate();
        uint256 expectedWithdrawableEpoch = staking.currentEpoch() + staking.VOLUNTARY_EXIT_DELAY();

        vm.prank(USER);
        staking.requestExit(validatorId);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.Exiting));
        assertEq(validator.withdrawableEpoch, expectedWithdrawableEpoch);
    }

    function testNonOwnerCannotRequestExit() public {
        uint256 validatorId = _stakeAndActivate();

        vm.expectRevert(MockEthereumStaking.NotValidatorOwner.selector);
        vm.prank(NON_OWNER);
        staking.requestExit(validatorId);
    }

    function testCannotWithdrawBeforeWithdrawable() public {
        uint256 validatorId = _stakeAndActivate();

        vm.prank(USER);
        staking.requestExit(validatorId);

        vm.expectRevert(
            abi.encodeWithSelector(
                MockEthereumStaking.InvalidValidatorStatus.selector,
                MockEthereumStaking.ValidatorStatus.Withdrawable,
                MockEthereumStaking.ValidatorStatus.Exiting
            )
        );
        vm.prank(WITHDRAWAL);
        staking.withdraw(validatorId);
    }

    function testCanWithdrawAfterExitDelay() public {
        uint256 validatorId = _stakeAndActivate();

        vm.prank(USER);
        staking.requestExit(validatorId);
        staking.advanceEpoch(staking.VOLUNTARY_EXIT_DELAY());
        staking.markWithdrawable(validatorId);

        uint256 balanceBefore = WITHDRAWAL.balance;
        vm.prank(WITHDRAWAL);
        staking.withdraw(validatorId);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.Withdrawn));
        assertEq(validator.balance, 0);
        assertEq(WITHDRAWAL.balance, balanceBefore + 0.032 ether);
    }

    function testSlashValidator() public {
        uint256 validatorId = _stakeAndActivate();
        uint256 expectedWithdrawableEpoch = staking.currentEpoch() + staking.SLASHING_WITHDRAWAL_DELAY();

        staking.slashValidator(validatorId, MockEthereumStaking.SlashReason.DoubleProposal);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.Slashed));
        assertTrue(validator.slashed);
        assertEq(uint256(validator.slashReason), uint256(MockEthereumStaking.SlashReason.DoubleProposal));
        assertEq(validator.balance, 0.031 ether);
        assertEq(validator.withdrawableEpoch, expectedWithdrawableEpoch);
    }

    function testSlashedValidatorCanWithdrawAfterSlashingDelay() public {
        uint256 validatorId = _stakeAndActivate();

        staking.slashValidator(validatorId, MockEthereumStaking.SlashReason.DoubleProposal);
        staking.advanceEpoch(staking.SLASHING_WITHDRAWAL_DELAY());
        staking.markWithdrawable(validatorId);

        vm.prank(WITHDRAWAL);
        staking.withdraw(validatorId);

        MockEthereumStaking.Validator memory validator = staking.getValidator(validatorId);
        assertEq(uint256(validator.status), uint256(MockEthereumStaking.ValidatorStatus.Withdrawn));
        assertEq(validator.balance, 0);
    }

    function testSlashedValidatorCannotRequestVoluntaryExit() public {
        uint256 validatorId = _stakeAndActivate();

        staking.slashValidator(validatorId, MockEthereumStaking.SlashReason.DoubleProposal);

        vm.expectRevert(
            abi.encodeWithSelector(
                MockEthereumStaking.InvalidValidatorStatus.selector,
                MockEthereumStaking.ValidatorStatus.Active,
                MockEthereumStaking.ValidatorStatus.Slashed
            )
        );
        vm.prank(USER);
        staking.requestExit(validatorId);
    }

    function testCannotSlashNonActiveValidator() public {
        uint256 validatorId = _stake();

        vm.expectRevert(
            abi.encodeWithSelector(
                MockEthereumStaking.InvalidValidatorStatus.selector,
                MockEthereumStaking.ValidatorStatus.Active,
                MockEthereumStaking.ValidatorStatus.PendingActivation
            )
        );
        staking.slashValidator(validatorId, MockEthereumStaking.SlashReason.DoubleProposal);
    }

    function testCannotSlashWithNoneReason() public {
        uint256 validatorId = _stakeAndActivate();

        vm.expectRevert(MockEthereumStaking.InvalidSlashReason.selector);
        staking.slashValidator(validatorId, MockEthereumStaking.SlashReason.None);
    }

    function _stake() internal returns (uint256 validatorId) {
        vm.prank(USER);
        validatorId = staking.stake{value: 0.032 ether}(WITHDRAWAL);
    }

    function _stakeAndActivate() internal returns (uint256 validatorId) {
        validatorId = _stake();
        staking.advanceEpoch(staking.ACTIVATION_DELAY());
        staking.activateValidator(validatorId);
    }
}
