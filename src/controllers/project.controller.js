const { ValidationError } = require("../errors");
const projectService = require("../services/project.service");

// ─── POST /projects ──────────────────────────────────────────────────

async function createProject(req, res) {
    if (
        !req.body ||
        typeof req.body.name !== "string" ||
        !req.body.name.trim()
    ) {
        throw new ValidationError("Name is required");
    }

    const project = await projectService.createProject({
        name: req.body.name.trim(),
    });

    return res.status(201).json(project);
}

// ─── GET /projects ───────────────────────────────────────────────────

async function listProjects(req, res) {
    const projects = await projectService.listProjects();

    return res.status(200).json(projects);
}

module.exports = { createProject, listProjects };
