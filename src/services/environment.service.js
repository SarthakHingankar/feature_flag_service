const prisma = require("../prisma");
const { NotFoundError, ConflictError } = require("../errors");

// ─── shared hierarchy check ───────────────────────────────────────────

/**
 * Verify that the project exists.
 * Returns the project row or throws NotFoundError.
 *
 * @param {string} projectId
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
async function validateProjectExists(projectId) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        throw new NotFoundError("Project not found");
    }

    return project;
}

// ─── create ───────────────────────────────────────────────────────────

/**
 * Create an environment under a validated project.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.name
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 * @throws {ConflictError}
 */
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

// ─── list ─────────────────────────────────────────────────────────────

/**
 * List all environments for a validated project.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @returns {Promise<object[]>}
 * @throws {NotFoundError}
 */
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
