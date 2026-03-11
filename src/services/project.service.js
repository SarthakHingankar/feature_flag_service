const prisma = require("../db/prisma");
const { ConflictError } = require("../utils/errors");

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
