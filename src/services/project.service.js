const prisma = require("../prisma");
const { ConflictError } = require("../errors");

// ─── create ───────────────────────────────────────────────────────────

/**
 * Create a project.
 *
 * @param {object} params
 * @param {string} params.name
 * @returns {Promise<object>}
 * @throws {ConflictError}
 */
async function createProject({ name }) {
    try {
        const project = await prisma.project.create({
            data: { name },
        });

        return project;
    } catch (error) {
        if (error.code === "P2002") {
            throw new ConflictError("Project already exists");
        }
        throw error;
    }
}

// ─── list ─────────────────────────────────────────────────────────────

/**
 * List all projects.
 *
 * @returns {Promise<object[]>}
 */
async function listProjects() {
    const projects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            createdAt: true,
        },
    });

    return projects;
}

module.exports = { createProject, listProjects };
