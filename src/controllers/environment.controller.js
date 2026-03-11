const { ValidationError } = require("../utils/errors");
const environmentService = require("../services/environment.service");

async function createEnvironment(req, res) {
    const { projectId } = req.params;

    if (
        !req.body ||
        typeof req.body.name !== "string" ||
        !req.body.name.trim()
    ) {
        throw new ValidationError("Name is required");
    }

    const environment = await environmentService.createEnvironment({
        projectId,
        name: req.body.name.trim(),
    });

    return res.status(201).json(environment);
}

async function listEnvironments(req, res) {
    const { projectId } = req.params;

    const environments = await environmentService.listEnvironments({
        projectId,
    });

    return res.status(200).json({
        data: environments,
        count: environments.length,
    });
}

module.exports = { createEnvironment, listEnvironments };
