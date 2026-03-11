const prisma = require("../db/prisma");
const { NotFoundError } = require("../utils/errors");

let snapshotStore = new Map();
let lastSnapshotVersion = null;

function parseTargetedUsers(targeting) {
    if (!targeting || typeof targeting !== "object") {
        return [];
    }

    const { allow } = targeting;

    if (!Array.isArray(allow)) {
        return [];
    }

    return allow.map((id) => String(id));
}

function toDomainFlag(row) {
    return {
        key: row.key,
        defaultValue: row.enabled,
        rolloutPercentage: row.rolloutPercentage,
        targetedUsers: parseTargetedUsers(row.targeting),
    };
}

async function loadSnapshotFromDB() {
    const environments = await prisma.environment.findMany({
        include: { project: true },
    });

    const snapshot = new Map();

    for (let i = 0; i < environments.length; i++) {
        const env = environments[i];
        const projectName = env.project.name;

        if (!snapshot.has(projectName)) {
            snapshot.set(projectName, new Map());
        }

        snapshot.get(projectName).set(env.name, []);
    }

    const flags = await prisma.featureFlag.findMany({
        include: {
            environment: {
                include: {
                    project: true,
                },
            },
        },
    });

    let maxUpdatedAt = null;

    for (let i = 0; i < flags.length; i++) {
        const row = flags[i];
        const projectName = row.environment.project.name;
        const envName = row.environment.name;

        snapshot.get(projectName).get(envName).push(toDomainFlag(row));

        if (!maxUpdatedAt || row.updatedAt > maxUpdatedAt) {
            maxUpdatedAt = row.updatedAt;
        }
    }

    return { snapshot, version: maxUpdatedAt };
}

async function initializeSnapshot() {
    const { snapshot, version } = await loadSnapshotFromDB();

    snapshotStore = snapshot;
    lastSnapshotVersion = version;

    const projectCount = snapshotStore.size;
    let flagCount = 0;

    for (const envMap of snapshotStore.values()) {
        for (const flags of envMap.values()) {
            flagCount += flags.length;
        }
    }

    console.log(JSON.stringify({
        event: "snapshot_initialized",
        projects: projectCount,
        flags: flagCount,
        version: lastSnapshotVersion,
    }));
}

function getFlagsFromSnapshot(projectName, environmentName) {
    const envMap = snapshotStore.get(projectName);

    if (!envMap) {
        throw new NotFoundError(`Project "${projectName}" not found`);
    }

    const flags = envMap.get(environmentName);

    if (!flags) {
        throw new NotFoundError(
            `Environment "${environmentName}" not found in project "${projectName}"`
        );
    }

    return flags;
}

async function refreshSnapshotIfNeeded() {
    const result = await prisma.featureFlag.aggregate({
        _max: { updatedAt: true },
    });

    const latestVersion = result._max.updatedAt;

    if (!latestVersion) {
        return;
    }

    if (
        lastSnapshotVersion &&
        latestVersion.getTime() <= lastSnapshotVersion.getTime()
    ) {
        return;
    }

    const { snapshot, version } = await loadSnapshotFromDB();

    snapshotStore = snapshot;
    lastSnapshotVersion = version;

    console.log(JSON.stringify({
        event: "snapshot_refreshed",
        version: lastSnapshotVersion,
    }));
}

function startSnapshotRefreshLoop(intervalMs) {
    return setInterval(async () => {
        try {
            await refreshSnapshotIfNeeded();
        } catch (error) {
            console.error(JSON.stringify({
                event: "snapshot_refresh_error",
                error: error.message,
            }));
        }
    }, intervalMs);
}

function getSnapshotStore() {
    return snapshotStore;
}

function getLastSnapshotVersion() {
    return lastSnapshotVersion;
}

module.exports = {
    initializeSnapshot,
    loadSnapshotFromDB,
    getFlagsFromSnapshot,
    refreshSnapshotIfNeeded,
    startSnapshotRefreshLoop,
    getSnapshotStore,
    getLastSnapshotVersion,
};
