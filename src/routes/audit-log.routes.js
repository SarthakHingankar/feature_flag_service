const { Router } = require("express");
const auditLogController = require("../controllers/audit-log.controller");

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", asyncHandler(auditLogController.listAuditLogs));

module.exports = router;
