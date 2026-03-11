const prisma = require("../db/prisma");
const { NotFoundError, ConflictError } = require("../utils/errors");

async function validateProjectExists(projectId) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        throw new NotFoundError("Project not found");
    }

    return project;
}

async function createEnvironment({ projectId, name }) {
    await validateProjectExists(projectId);

    try {
        const environment = await prisma.environment.create({
            data: {
                name,
                projectId,
            },
            select: {
                id: true,
                name: true,
                projectId: true,
                createdAt: true,
            },
        });

        return environment;
    } catch (error) {
        if (error.code === "P2002") {
            throw new ConflictError(
                "Environment already exists for this project"
            );
        }
        throw error;
    }
}

async function listEnvironments({ projectId }) {
    await validateProjectExists(projectId);

    const environments = await prisma.environment.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            projectId: true,
            createdAt: true,
        },
    });

    return environments;
}

module.exports = { createEnvironment, listEnvironments };
