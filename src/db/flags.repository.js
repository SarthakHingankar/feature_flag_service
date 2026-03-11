const prisma = require("./prisma");
const { NotFoundError } = require("../utils/errors");

function buildRules(flag) {
    const rules = [];

    if (flag.rolloutPercentage > 0) {
        rules.push({
            type: "percentage",
            parameters: { percentage: flag.rolloutPercentage },
        });
    }

    if (flag.targeting && typeof flag.targeting === "object") {
        rules.push({
            type: "user_target",
            parameters: flag.targeting,
        });
    }

    return rules;
}

async function getFlags(projectKey, envName) {
    const project = await prisma.project.findUnique({
        where: { name: projectKey },
    });

    if (!project) {
        throw new NotFoundError(`Project "${projectKey}" not found`);
    }

    const environment = await prisma.environment.findUnique({
        where: {
            projectId_name: {
                projectId: project.id,
                name: envName,
            },
        },
    });

    if (!environment) {
        throw new NotFoundError(
            `Environment "${envName}" not found in project "${projectKey}"`
        );
    }

    const flags = await prisma.featureFlag.findMany({
        where: { environmentId: environment.id },
    });

    return flags.map((flag) => ({
        key: flag.key,
        defaultValue: flag.enabled,
        rules: buildRules(flag),
    }));
}

module.exports = { getFlags };
