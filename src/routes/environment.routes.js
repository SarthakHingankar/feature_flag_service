const { Router } = require("express");
const environmentController = require("../controllers/environment.controller");

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.post(
    "/:projectId/environments",
    asyncHandler(environmentController.createEnvironment)
);

router.get(
    "/:projectId/environments",
    asyncHandler(environmentController.listEnvironments)
);

module.exports = router;
