const crypto = require("crypto");

function deterministicHash(input, maxBuckets = 100) {
    if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
        throw new Error("maxBuckets must be a positive integer");
    }

    if (input === null || input === undefined) {
        throw new Error("Input cannot be null or undefined");
    }

    const normalizedInput = String(input);

    if (normalizedInput.length === 0) {
        throw new Error("Input cannot be an empty string");
    }

    const hashHex = crypto
        .createHash("sha256")
        .update(normalizedInput)
        .digest("hex");

    const hashInt = parseInt(hashHex.substring(0, 8), 16);

    if (!Number.isFinite(hashInt)) {
        throw new Error("Failed to compute hash integer");
    }

    return hashInt % maxBuckets;
}

function evaluateRollout(userId, flagKey, percentage) {
    if (userId === null || userId === undefined) {
        throw new Error("userId is required");
    }

    if (flagKey === null || flagKey === undefined) {
        throw new Error("flagKey is required");
    }

    if (typeof percentage !== "number" || Number.isNaN(percentage)) {
        throw new Error("percentage must be a valid number");
    }

    if (percentage < 0 || percentage > 100) {
        throw new Error("percentage must be between 0 and 100");
    }

    if (percentage === 0) {
        return false;
    }

    if (percentage === 100) {
        return true;
    }

    const normalizedUserId = String(userId);
    const normalizedFlagKey = String(flagKey);

    if (normalizedUserId.length === 0) {
        throw new Error("userId cannot be empty");
    }

    if (normalizedFlagKey.length === 0) {
        throw new Error("flagKey cannot be empty");
    }

    const input = `${normalizedUserId}:${normalizedFlagKey}`;
    const bucket = deterministicHash(input, 100);

    return bucket < percentage;
}

function isTargetedUser(userId, targeting) {
    if (userId === null || userId === undefined) {
        throw new Error("userId is required");
    }

    if (!targeting || typeof targeting !== "object") {
        return false;
    }

    const { allow } = targeting;

    if (!Array.isArray(allow) || allow.length === 0) {
        return false;
    }

    const normalizedUserId = String(userId);

    return allow.some((id) => String(id) === normalizedUserId);
}

function evaluate(userId, flagDefinition) {
    if (userId === null || userId === undefined) {
        throw new Error("userId is required");
    }

    if (!flagDefinition || typeof flagDefinition !== "object") {
        throw new Error("flagDefinition must be a valid object");
    }

    const { key, enabled, rolloutPercentage = 0, targeting } = flagDefinition;

    if (!key || typeof key !== "string") {
        throw new Error("flagDefinition.key must be a valid string");
    }

    if (typeof enabled !== "boolean") {
        throw new Error("flagDefinition.enabled must be a boolean");
    }

    if (!enabled) {
        return false;
    }

    const normalizedUserId = String(userId);

    if (isTargetedUser(normalizedUserId, targeting)) {
        return true;
    }

    return evaluateRollout(normalizedUserId, key, rolloutPercentage);
}

function evaluateFlag(userId, flag) {
    if (!flag.defaultValue) {
        return false;
    }

    const rules = flag.rules;

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        if (rule.type === "user_target") {
            if (isTargetedUser(userId, rule.parameters)) {
                return true;
            }
        }

        if (rule.type === "percentage") {
            return evaluateRollout(userId, flag.key, rule.parameters.percentage);
        }
    }

    return flag.defaultValue;
}

function evaluateFlags(userId, flags) {
    const result = {};

    for (let i = 0; i < flags.length; i++) {
        result[flags[i].key] = evaluateFlag(userId, flags[i]);
    }

    return result;
}

module.exports = {
    evaluate,
    evaluateFlag,
    evaluateFlags,
    deterministicHash,
    evaluateRollout,
    isTargetedUser
};