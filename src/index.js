const express = require("express");
const prisma = require("./prisma");
const projectRoutes = require("./routes/project.routes");
const environmentRoutes = require("./routes/environment.routes");
const flagRoutes = require("./routes/flag.routes");
const errorHandler = require("./middleware/error.middleware");
const app = express();

app.use(express.json());

app.use("/projects", projectRoutes);
app.use("/projects", environmentRoutes);
app.use("/projects", flagRoutes);

app.get("/audit-logs", async (req, res) => {
    try {
        const { entityType, entityId, limit } = req.query;

        let parsedLimit = 50;

        if (limit !== undefined) {
            const numericLimit = Number(limit);

            if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
                return res.status(400).json({
                    error: "Limit must be a positive integer",
                });
            }

            parsedLimit = Math.min(numericLimit, 200);
        }

        const whereClause = {};

        if (entityType !== undefined) {
            if (typeof entityType !== "string" || !entityType.trim()) {
                return res.status(400).json({
                    error: "entityType must be a non-empty string",
                });
            }

            whereClause.entityType = entityType.trim();
        }

        if (entityId !== undefined) {
            if (typeof entityId !== "string" || !entityId.trim()) {
                return res.status(400).json({
                    error: "entityId must be a non-empty string",
                });
            }

            whereClause.entityId = entityId.trim();
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: parsedLimit,
            select: {
                id: true,
                entityType: true,
                entityId: true,
                action: true,
                actor: true,
                before: true,
                after: true,
                createdAt: true,
            },
        });

        return res.status(200).json({
            data: logs,
            count: logs.length,
        });

    } catch (error) {
        console.error("GET /audit-logs failed:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});