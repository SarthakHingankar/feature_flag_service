const { ValidationError } = require("../errors");
const flagService = require("../services/flag.service");

// ─── POST /:projectId/environments/:envId/flags ──────────────────────

async function createFlag(req, res) {
    const { projectId, envId } = req.params;

    if (!req.body || typeof req.body.key !== "string" || !req.body.key.trim()) {
        throw new ValidationError("Key is required");
    }

    if (typeof req.body.enabled !== "boolean") {
        throw new ValidationError("Enabled must be boolean");
    }

    const flag = await flagService.createFlag({
        projectId,
        envId,
        data: {
            key: req.body.key.trim(),
            description: req.body.description || null,
            enabled: req.body.enabled,
        },
    });

    return res.status(201).json(flag);
}

// ─── GET /:projectId/environments/:envId/flags ───────────────────────

async function listFlags(req, res) {
    const { projectId, envId } = req.params;

    const flags = await flagService.listFlags({ projectId, envId });

    return res.status(200).json({
        data: flags,
        count: flags.length,
    });
}

// ─── PATCH /:projectId/environments/:envId/flags/:flagId ─────────────

/**
 * Validates input, delegates to the service layer, and returns the
 * shaped HTTP response.  Errors propagate to the centralised error
 * middleware — no local try/catch required.
 */
async function updateFlag(req, res) {
    const { projectId, envId, flagId } = req.params;

    if (!req.body || typeof req.body !== "object") {
        throw new ValidationError("Invalid request body");
    }

    const { enabled, description } = req.body;

    if (enabled === undefined && description === undefined) {
        throw new ValidationError(
            "At least one field (enabled or description) must be provided"
        );
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
        throw new ValidationError("Enabled must be boolean");
    }

    if (description !== undefined && typeof description !== "string") {
        throw new ValidationError("Description must be string");
    }

    const result = await flagService.updateFlag({
        projectId,
        envId,
        flagId,
        data: { enabled, description },
    });

    return res.status(200).json({
        id: result.id,
        key: result.key,
        description: result.description,
        enabled: result.enabled,
        createdAt: result.createdAt,
    });
}

module.exports = { createFlag, listFlags, updateFlag };
