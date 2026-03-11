const { ValidationError } = require("../errors");
const flagService = require("../services/flag.service");

async function createFlag(req, res) {
    const { projectId, envId } = req.params;

    if (!req.body || typeof req.body.key !== "string" || !req.body.key.trim()) {
        throw new ValidationError("Key is required");
    }

    if (typeof req.body.enabled !== "boolean") {
        throw new ValidationError("Enabled must be boolean");
    }

    if (req.body.rolloutPercentage !== undefined) {
        if (
            !Number.isInteger(req.body.rolloutPercentage) ||
            req.body.rolloutPercentage < 0 ||
            req.body.rolloutPercentage > 100
        ) {
            throw new ValidationError(
                "rolloutPercentage must be an integer between 0 and 100"
            );
        }
    }

    if (req.body.targeting !== undefined && req.body.targeting !== null) {
        if (
            typeof req.body.targeting !== "object" ||
            Array.isArray(req.body.targeting)
        ) {
            throw new ValidationError("targeting must be a JSON object or null");
        }
    }

    const flag = await flagService.createFlag({
        projectId,
        envId,
        data: {
            key: req.body.key.trim(),
            description: req.body.description || null,
            enabled: req.body.enabled,
            rolloutPercentage: req.body.rolloutPercentage ?? 0,
            targeting: req.body.targeting ?? null,
        },
    });

    return res.status(201).json(flag);
}

async function listFlags(req, res) {
    const { projectId, envId } = req.params;

    const flags = await flagService.listFlags({ projectId, envId });

    return res.status(200).json({
        data: flags,
        count: flags.length,
    });
}

async function updateFlag(req, res) {
    const { projectId, envId, flagId } = req.params;

    if (!req.body || typeof req.body !== "object") {
        throw new ValidationError("Invalid request body");
    }

    const { enabled, description, rolloutPercentage, targeting } = req.body;

    if (
        enabled === undefined &&
        description === undefined &&
        rolloutPercentage === undefined &&
        targeting === undefined
    ) {
        throw new ValidationError(
            "At least one field (enabled, description, rolloutPercentage, or targeting) must be provided"
        );
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
        throw new ValidationError("Enabled must be boolean");
    }

    if (description !== undefined && typeof description !== "string") {
        throw new ValidationError("Description must be string");
    }

    if (rolloutPercentage !== undefined) {
        if (
            !Number.isInteger(rolloutPercentage) ||
            rolloutPercentage < 0 ||
            rolloutPercentage > 100
        ) {
            throw new ValidationError(
                "rolloutPercentage must be an integer between 0 and 100"
            );
        }
    }

    if (targeting !== undefined && targeting !== null) {
        if (typeof targeting !== "object" || Array.isArray(targeting)) {
            throw new ValidationError("targeting must be a JSON object or null");
        }
    }

    const result = await flagService.updateFlag({
        projectId,
        envId,
        flagId,
        data: { enabled, description, rolloutPercentage, targeting },
    });

    return res.status(200).json({
        id: result.id,
        key: result.key,
        description: result.description,
        enabled: result.enabled,
        rolloutPercentage: result.rolloutPercentage,
        targeting: result.targeting,
        createdAt: result.createdAt,
    });
}

module.exports = { createFlag, listFlags, updateFlag };
