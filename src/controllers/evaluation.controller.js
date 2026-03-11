const { ValidationError } = require("../utils/errors");
const { getFlagsFromSnapshot } = require("../runtime/snapshot");
const { evaluateFlags } = require("../runtime/evaluator");

async function getConfig(req, res) {
    const { project, env, user_id } = req.query;

    if (!project || typeof project !== "string" || !project.trim()) {
        throw new ValidationError("Query parameter 'project' is required");
    }

    if (!env || typeof env !== "string" || !env.trim()) {
        throw new ValidationError("Query parameter 'env' is required");
    }

    if (!user_id || typeof user_id !== "string" || !user_id.trim()) {
        throw new ValidationError("Query parameter 'user_id' is required");
    }

    const projectKey = project.trim();
    const environment = env.trim();
    const userId = user_id.trim();

    const startTime = Date.now();

    const flags = getFlagsFromSnapshot(projectKey, environment);
    const evaluated = evaluateFlags(userId, flags);

    const evaluationTimeMs = Date.now() - startTime;

    console.log(JSON.stringify({
        event: "flag_evaluation",
        project: projectKey,
        environment,
        user_id: userId,
        number_of_flags: flags.length,
        evaluation_time_ms: evaluationTimeMs,
    }));

    return res.status(200).json({
        project: projectKey,
        environment,
        flags: evaluated,
    });
}

module.exports = { getConfig };
