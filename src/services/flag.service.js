const prisma = require("../prisma");
const { NotFoundError, ConflictError } = require("../errors");

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

async function createFlag({ projectId, envId, data }) {
    await validateEnvironmentHierarchy(projectId, envId);

    try {
        const flag = await prisma.featureFlag.create({
            data: {
                key: data.key,
                description: data.description,
                enabled: data.enabled,
                rolloutPercentage: data.rolloutPercentage,
                targeting: data.targeting,
                environmentId: envId,
            },
            select: {
                id: true,
                key: true,
                description: true,
                enabled: true,
                rolloutPercentage: true,
                targeting: true,
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
            rolloutPercentage: true,
            targeting: true,
            createdAt: true,
        },
    });

    return flags;
}

async function updateFlag({ projectId, envId, flagId, data }) {
    const { enabled, description, rolloutPercentage, targeting } = data;

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
                ...(rolloutPercentage !== undefined && { rolloutPercentage }),
                ...(targeting !== undefined && { targeting }),
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
