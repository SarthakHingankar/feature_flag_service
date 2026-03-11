if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
        "postgresql://postgres:postgres@localhost:5432/featureflags";
}
const prisma = require("../db/prisma");
const { initializeSnapshot, getFlagsFromSnapshot } = require("./snapshot");
const { evaluateFlags } = require("./evaluator");

async function seedProject(name) {
    return prisma.project.create({ data: { name } });
}

async function seedEnvironment(projectId, name) {
    return prisma.environment.create({ data: { name, projectId } });
}

async function seedFlag(environmentId, data) {
    return prisma.featureFlag.create({
        data: {
            key: data.key,
            enabled: data.enabled ?? false,
            rolloutPercentage: data.rolloutPercentage ?? 0,
            targeting: data.targeting ?? undefined,
            description: data.description ?? null,
            environmentId,
        },
    });
}

async function seedAndSnapshot(seedFn) {
    await seedFn();
    await initializeSnapshot();
}

describe("GET /config integration", () => {
    beforeEach(async () => {
        await prisma.featureFlag.deleteMany();
        await prisma.environment.deleteMany();
        await prisma.auditLog.deleteMany();
        await prisma.project.deleteMany();
    });

    afterAll(async () => {
        await prisma.featureFlag.deleteMany();
        await prisma.environment.deleteMany();
        await prisma.auditLog.deleteMany();
        await prisma.project.deleteMany();
        await prisma.$disconnect();
    });

    test("getFlagsFromSnapshot throws when project does not exist", async () => {
        await initializeSnapshot();

        expect(() => getFlagsFromSnapshot("non-existent", "prod")).toThrow(
            /not found/i
        );
    });

    test("getFlagsFromSnapshot throws when environment does not exist", async () => {
        await seedAndSnapshot(async () => {
            await seedProject("proj-404-env");
        });

        expect(() => getFlagsFromSnapshot("proj-404-env", "staging")).toThrow(
            /not found/i
        );
    });

    test("default flag with enabled=true and no rules evaluates to true", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-default");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "always-on",
                enabled: true,
                rolloutPercentage: 0,
            });
        });

        const flags = getFlagsFromSnapshot("proj-default", "production");
        const result = evaluateFlags("any-user", flags);

        expect(result).toEqual({ "always-on": true });
    });

    test("default flag with enabled=false evaluates to false regardless of rules", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-disabled");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "off-flag",
                enabled: false,
                rolloutPercentage: 100,
                targeting: { allow: ["any-user"] },
            });
        });

        const flags = getFlagsFromSnapshot("proj-disabled", "production");
        const result = evaluateFlags("any-user", flags);

        expect(result).toEqual({ "off-flag": false });
    });

    test("targeted user gets flag=true even when rollout is 0%", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-targeting");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "targeted-flag",
                enabled: true,
                rolloutPercentage: 0,
                targeting: { allow: ["user-1"] },
            });
        });

        const flags = getFlagsFromSnapshot("proj-targeting", "production");
        const resultUser1 = evaluateFlags("user-1", flags);

        expect(resultUser1).toEqual({ "targeted-flag": true });
    });

    test("non-targeted user falls back to defaultValue when no percentage rule exists", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-target-fallback");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "fallback-flag",
                enabled: true,
                rolloutPercentage: 0,
                targeting: { allow: ["vip-user"] },
            });
        });

        const flags = getFlagsFromSnapshot("proj-target-fallback", "production");
        const result = evaluateFlags("regular-user", flags);

        expect(result).toEqual({ "fallback-flag": true });
    });

    test("100 percent rollout enables flag for all users", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-rollout");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "full-rollout",
                enabled: true,
                rolloutPercentage: 100,
            });
        });

        const flags = getFlagsFromSnapshot("proj-rollout", "production");

        expect(evaluateFlags("user-a", flags)).toEqual({ "full-rollout": true });
        expect(evaluateFlags("user-b", flags)).toEqual({ "full-rollout": true });
        expect(evaluateFlags("user-c", flags)).toEqual({ "full-rollout": true });
    });

    test("same user produces deterministic results across multiple calls", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-deterministic");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "det-flag",
                enabled: true,
                rolloutPercentage: 50,
            });
        });

        const flags = getFlagsFromSnapshot("proj-deterministic", "production");

        const result1 = evaluateFlags("stable-user", flags);
        const result2 = evaluateFlags("stable-user", flags);
        const result3 = evaluateFlags("stable-user", flags);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
    });

    test("multiple flags are all evaluated correctly", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-multi");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, { key: "flag-on", enabled: true, rolloutPercentage: 0 });
            await seedFlag(env.id, { key: "flag-off", enabled: false });
            await seedFlag(env.id, {
                key: "flag-targeted",
                enabled: true,
                rolloutPercentage: 0,
                targeting: { allow: ["multi-user"] },
            });
        });

        const flags = getFlagsFromSnapshot("proj-multi", "production");
        const result = evaluateFlags("multi-user", flags);

        expect(result["flag-on"]).toBe(true);
        expect(result["flag-off"]).toBe(false);
        expect(result["flag-targeted"]).toBe(true);
        expect(Object.keys(result)).toHaveLength(3);
    });

    test("response shape matches expected structure", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-shape");
            const env = await seedEnvironment(project.id, "staging");
            await seedFlag(env.id, {
                key: "shape-flag",
                enabled: true,
                rolloutPercentage: 100,
            });
        });

        const flags = getFlagsFromSnapshot("proj-shape", "staging");
        const evaluated = evaluateFlags("user-x", flags);

        const response = {
            project: "proj-shape",
            environment: "staging",
            flags: evaluated,
        };

        expect(response).toEqual({
            project: expect.any(String),
            environment: expect.any(String),
            flags: expect.objectContaining({
                "shape-flag": expect.any(Boolean),
            }),
        });
    });

    test("environment with no flags returns empty flags object", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-empty");
            await seedEnvironment(project.id, "production");
        });

        const flags = getFlagsFromSnapshot("proj-empty", "production");
        const result = evaluateFlags("user-1", flags);

        expect(result).toEqual({});
    });

    test("snapshot domain flag has correct shape", async () => {
        await seedAndSnapshot(async () => {
            const project = await seedProject("proj-shape-check");
            const env = await seedEnvironment(project.id, "production");
            await seedFlag(env.id, {
                key: "shape-check",
                enabled: true,
                rolloutPercentage: 50,
                targeting: { allow: ["user-a", "user-b"] },
            });
        });

        const flags = getFlagsFromSnapshot("proj-shape-check", "production");

        expect(flags).toHaveLength(1);
        expect(flags[0]).toEqual({
            key: "shape-check",
            defaultValue: true,
            rolloutPercentage: 50,
            targetedUsers: ["user-a", "user-b"],
        });
    });
});
