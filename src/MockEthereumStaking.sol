// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockEthereumStaking
/// @notice Simplified Ethereum validator staking lifecycle simulator.
/// @dev This is a demo-oriented state machine and is not real Ethereum consensus logic.
contract MockEthereumStaking {
    enum ValidatorStatus {
        None,
        PendingActivation,
        Active,
        Exiting,
        Slashed,
        Withdrawable,
        Withdrawn
    }

    enum SlashReason {
        None,
        DoubleProposal,
        DoubleVote,
        SurroundVote
    }

    struct Validator {
        address owner;
        address withdrawalAddress;
        uint256 balance;
        uint256 activationEpoch;
        uint256 exitEpoch;
        uint256 withdrawableEpoch;
        bool slashed;
        ValidatorStatus status;
        SlashReason slashReason;
    }

    uint256 public constant REQUIRED_STAKE = 0.032 ether;
    uint256 public constant ACTIVATION_DELAY = 2;
    uint256 public constant VOLUNTARY_EXIT_DELAY = 4;
    uint256 public constant SLASHING_WITHDRAWAL_DELAY = 8;
    uint256 public constant SLASHING_PENALTY = 0.001 ether;

    uint256 public currentEpoch;
    uint256 public nextValidatorId;
    mapping(uint256 => Validator) public validators;

    error InvalidStakeAmount();
    error ZeroWithdrawalAddress();
    error ValidatorDoesNotExist();
    error InvalidValidatorStatus(ValidatorStatus expected, ValidatorStatus actual);
    error InvalidValidatorStatusForWithdrawable(ValidatorStatus actual);
    error ActivationEpochNotReached(uint256 currentEpoch, uint256 activationEpoch);
    error AmountMustBeGreaterThanZero();
    error IncorrectRewardValue();
    error PenaltyExceedsBalance();
    error NotValidatorOwner();
    error InvalidSlashReason();
    error WithdrawableEpochNotReached(uint256 currentEpoch, uint256 withdrawableEpoch);
    error NotWithdrawalAddress();
    error WithdrawalTransferFailed();

    event ValidatorStaked(
        uint256 indexed validatorId,
        address indexed owner,
        address indexed withdrawalAddress,
        uint256 amount,
        uint256 activationEpoch
    );
    event ValidatorActivated(uint256 indexed validatorId, uint256 epoch);
    event RewardApplied(uint256 indexed validatorId, uint256 amount, uint256 newBalance);
    event PenaltyApplied(uint256 indexed validatorId, uint256 amount, uint256 newBalance);
    event ExitRequested(uint256 indexed validatorId, uint256 exitEpoch, uint256 withdrawableEpoch);
    event ValidatorSlashed(
        uint256 indexed validatorId,
        SlashReason reason,
        uint256 penalty,
        uint256 newBalance,
        uint256 withdrawableEpoch
    );
    event ValidatorWithdrawable(uint256 indexed validatorId, uint256 epoch);
    event ValidatorWithdrawn(uint256 indexed validatorId, address indexed withdrawalAddress, uint256 amount);
    event EpochAdvanced(uint256 oldEpoch, uint256 newEpoch);

    function stake(address withdrawalAddress) external payable returns (uint256 validatorId) {
        if (msg.value != REQUIRED_STAKE) revert InvalidStakeAmount();
        if (withdrawalAddress == address(0)) revert ZeroWithdrawalAddress();

        validatorId = nextValidatorId++;
        uint256 activationEpoch = currentEpoch + ACTIVATION_DELAY;

        validators[validatorId] = Validator({
            owner: msg.sender,
            withdrawalAddress: withdrawalAddress,
            balance: msg.value,
            activationEpoch: activationEpoch,
            exitEpoch: 0,
            withdrawableEpoch: 0,
            slashed: false,
            status: ValidatorStatus.PendingActivation,
            slashReason: SlashReason.None
        });

        emit ValidatorStaked(validatorId, msg.sender, withdrawalAddress, msg.value, activationEpoch);
    }

    function activateValidator(uint256 validatorId) external {
        Validator storage validator = _validator(validatorId);
        _requireStatus(validator, ValidatorStatus.PendingActivation);
        if (currentEpoch < validator.activationEpoch) {
            revert ActivationEpochNotReached(currentEpoch, validator.activationEpoch);
        }

        validator.status = ValidatorStatus.Active;

        emit ValidatorActivated(validatorId, currentEpoch);
    }

    function simulateReward(uint256 validatorId, uint256 amount) external payable {
        Validator storage validator = _validator(validatorId);
        _requireStatus(validator, ValidatorStatus.Active);
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (msg.value != amount) revert IncorrectRewardValue();

        validator.balance += amount;

        emit RewardApplied(validatorId, amount, validator.balance);
    }

    function simulatePenalty(uint256 validatorId, uint256 amount) external {
        Validator storage validator = _validator(validatorId);
        _requireStatus(validator, ValidatorStatus.Active);
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (amount > validator.balance) revert PenaltyExceedsBalance();

        validator.balance -= amount;

        emit PenaltyApplied(validatorId, amount, validator.balance);
    }

    function requestExit(uint256 validatorId) external {
        Validator storage validator = _validator(validatorId);
        if (msg.sender != validator.owner) revert NotValidatorOwner();
        _requireStatus(validator, ValidatorStatus.Active);

        validator.status = ValidatorStatus.Exiting;
        validator.exitEpoch = currentEpoch;
        validator.withdrawableEpoch = currentEpoch + VOLUNTARY_EXIT_DELAY;

        emit ExitRequested(validatorId, validator.exitEpoch, validator.withdrawableEpoch);
    }

    function slashValidator(uint256 validatorId, SlashReason reason) external {
        Validator storage validator = _validator(validatorId);
        _requireStatus(validator, ValidatorStatus.Active);
        if (reason == SlashReason.None) revert InvalidSlashReason();

        // Permissionless for this simulator only; real systems require slashing proof verification.
        validator.status = ValidatorStatus.Slashed;
        validator.slashed = true;
        validator.slashReason = reason;
        validator.exitEpoch = currentEpoch;
        validator.withdrawableEpoch = currentEpoch + SLASHING_WITHDRAWAL_DELAY;

        if (validator.balance < SLASHING_PENALTY) {
            validator.balance = 0;
        } else {
            validator.balance -= SLASHING_PENALTY;
        }

        emit ValidatorSlashed(validatorId, reason, SLASHING_PENALTY, validator.balance, validator.withdrawableEpoch);
    }

    function markWithdrawable(uint256 validatorId) public {
        Validator storage validator = _validator(validatorId);
        if (validator.status != ValidatorStatus.Exiting && validator.status != ValidatorStatus.Slashed) {
            revert InvalidValidatorStatusForWithdrawable(validator.status);
        }
        if (currentEpoch < validator.withdrawableEpoch) {
            revert WithdrawableEpochNotReached(currentEpoch, validator.withdrawableEpoch);
        }

        validator.status = ValidatorStatus.Withdrawable;

        emit ValidatorWithdrawable(validatorId, currentEpoch);
    }

    function withdraw(uint256 validatorId) external {
        Validator storage validator = _validator(validatorId);
        if (msg.sender != validator.withdrawalAddress) revert NotWithdrawalAddress();
        _requireStatus(validator, ValidatorStatus.Withdrawable);

        uint256 amount = validator.balance;
        address withdrawalAddress = validator.withdrawalAddress;
        validator.balance = 0;
        validator.status = ValidatorStatus.Withdrawn;

        (bool success,) = withdrawalAddress.call{value: amount}("");
        if (!success) revert WithdrawalTransferFailed();

        emit ValidatorWithdrawn(validatorId, withdrawalAddress, amount);
    }

    function advanceEpoch(uint256 epochs) external {
        if (epochs == 0) revert AmountMustBeGreaterThanZero();

        uint256 oldEpoch = currentEpoch;
        currentEpoch += epochs;

        emit EpochAdvanced(oldEpoch, currentEpoch);
    }

    function getValidator(uint256 validatorId) external view returns (Validator memory) {
        return _validatorView(validatorId);
    }

    function _validator(uint256 validatorId) private view returns (Validator storage validator) {
        validator = validators[validatorId];
        if (validator.status == ValidatorStatus.None) revert ValidatorDoesNotExist();
    }

    function _validatorView(uint256 validatorId) private view returns (Validator memory validator) {
        validator = validators[validatorId];
        if (validator.status == ValidatorStatus.None) revert ValidatorDoesNotExist();
    }

    function _requireStatus(Validator storage validator, ValidatorStatus expected) private view {
        if (validator.status != expected) revert InvalidValidatorStatus(expected, validator.status);
    }
}
