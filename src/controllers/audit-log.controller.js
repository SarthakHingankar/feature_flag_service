const prisma = require("../db/prisma");
const { ValidationError } = require("../utils/errors");

async function listAuditLogs(req, res) {
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
}

module.exports = { listAuditLogs };
