const express = require("express");
const prisma = require("./prisma");
const app = express();

app.use(express.json());

app.post("/projects", async (req, res) => {
    try {
        if (!req.body || typeof req.body.name !== "string" || !req.body.name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const name = req.body.name.trim();

        const project = await prisma.project.create({
            data: { name },
        });

        return res.status(201).json(project);

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Project already exists" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/projects", async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
        });

        return res.status(200).json(projects);

    } catch (error) {
        console.error("GET /projects failed:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

app.post("/projects/:projectId/environments", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!req.body || typeof req.body.name !== "string" || !req.body.name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const environment = await prisma.environment.create({
            data: {
                name: req.body.name.trim(),
                projectId,
            },
            select: {
                id: true,
                name: true,
                projectId: true,
                createdAt: true,
            },
        });

        return res.status(201).json(environment);

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                error: "Environment already exists for this project",
            });
        }

        console.error("POST /environments failed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/projects/:projectId/environments", async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

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

        return res.status(200).json({
            data: environments,
            count: environments.length,
        });

    } catch (error) {
        console.error("GET /environments failed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/projects/:projectId/environments/:envId/flags", async (req, res) => {
    try {
        const { projectId, envId } = req.params;

        if (!req.body || typeof req.body.key !== "string" || !req.body.key.trim()) {
            return res.status(400).json({ error: "Key is required" });
        }

        if (typeof req.body.enabled !== "boolean") {
            return res.status(400).json({ error: "Enabled must be boolean" });
        }

        const environment = await prisma.environment.findFirst({
            where: {
                id: envId,
                projectId,
            },
        });

        if (!environment) {
            return res.status(404).json({
                error: "Environment not found under this project",
            });
        }

        const flag = await prisma.featureFlag.create({
            data: {
                key: req.body.key.trim(),
                description: req.body.description || null,
                enabled: req.body.enabled,
                environmentId: envId,
            },
            select: {
                id: true,
                key: true,
                description: true,
                enabled: true,
                environmentId: true,
                createdAt: true,
            },
        });

        return res.status(201).json(flag);

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                error: "Flag already exists in this environment",
            });
        }

        console.error("POST /flags failed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/projects/:projectId/environments/:envId/flags", async (req, res) => {
    try {
        const { projectId, envId } = req.params;

        const environment = await prisma.environment.findFirst({
            where: {
                id: envId,
                projectId,
            },
        });

        if (!environment) {
            return res.status(404).json({
                error: "Environment not found under this project",
            });
        }

        const flags = await prisma.featureFlag.findMany({
            where: { environmentId: envId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                key: true,
                description: true,
                enabled: true,
                createdAt: true,
            },
        });

        return res.status(200).json({
            data: flags,
            count: flags.length,
        });

    } catch (error) {
        console.error("GET /flags failed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});