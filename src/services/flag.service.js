const prisma = require("../prisma");
const { NotFoundError, ConflictError } = require("../errors");

// ─── shared hierarchy check ───────────────────────────────────────────

/**
 * Verify that the environment belongs to the given project.
 * Returns the environment row or throws NotFoundError.
 *
 * @param {string} projectId
 * @param {string} envId
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
async function validateEnvironmentHierarchy(projectId, envId) {
    const environment = await prisma.environment.findFirst({
        where: {
            id: envId,
            projectId,
        },
    });

    if (!environment) {
        throw new NotFoundError(
            "Environment not found under this project"
        );
    }

    return environment;
}

// ─── create ───────────────────────────────────────────────────────────

/**
 * Create a feature flag under a validated environment.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.envId
 * @param {object} params.data  – { key, enabled, description? }
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 * @throws {PrismaClientKnownRequestError} – P2002 (duplicate key)
 */
async function createFlag({ projectId, envId, data }) {
    await validateEnvironmentHierarchy(projectId, envId);

    try {
        const flag = await prisma.featureFlag.create({
            data: {
                key: data.key,
                description: data.description,
                enabled: data.enabled,
                environmentId: envId,
            },
            select: {
                id: true,
                key: true,
                description: true,
                enabled: true,
                environmentId: true,
                createdAt: true,
            },
        });

        return flag;
    } catch (error) {
        if (error.code === "P2002") {
            throw new ConflictError("Flag already exists in this environment");
        }
        throw error;
    }
}

// ─── list ─────────────────────────────────────────────────────────────

/**
 * List all flags for a validated environment.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.envId
 * @returns {Promise<object[]>}
 * @throws {NotFoundError}
 */
async function listFlags({ projectId, envId }) {
    await validateEnvironmentHierarchy(projectId, envId);

    const flags = await prisma.featureFlag.findMany({
        where: { environmentId: envId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            key: true,
            description: true,
            enabled: true,
            createdAt: true,
        },
    });

    return flags;
}

// ─── update ───────────────────────────────────────────────────────────

/**
 * Update a feature flag and write an atomic audit log entry.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.envId
 * @param {string} params.flagId
 * @param {object} params.data          – fields to update (enabled, description)
 * @returns {Promise<object>}           – the updated flag row
 * @throws {NotFoundError}              – flag/env/project hierarchy not found
 * @throws {PrismaClientKnownRequestError} – e.g. P2002 (unique constraint)
 */
async function updateFlag({ projectId, envId, flagId, data }) {
    const { enabled, description } = data;

    const result = await prisma.$transaction(async (tx) => {
        const flag = await tx.featureFlag.findFirst({
            where: {
                id: flagId,
                environmentId: envId,
                environment: {
                    projectId: projectId,
                },
            },
        });

        if (!flag) {
            throw new NotFoundError(
                "Flag not found under specified project/environment"
            );
        }

        const beforeSnapshot = flag;

        const updatedFlag = await tx.featureFlag.update({
            where: { id: flagId },
            data: {
                ...(enabled !== undefined && { enabled }),
                ...(description !== undefined && {
                    description: description.trim(),
                }),
            },
        });

        await tx.auditLog.create({
            data: {
                entityType: "FeatureFlag",
                entityId: flagId,
                action: "UPDATE",
                actor: "system",
                before: beforeSnapshot,
                after: updatedFlag,
            },
        });

        return updatedFlag;
    });

    return result;
}

module.exports = { createFlag, listFlags, updateFlag };
