const { Router } = require("express");
const projectController = require("../controllers/project.controller");

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.post(
    "/",
    asyncHandler(projectController.createProject)
);

router.get(
    "/",
    asyncHandler(projectController.listProjects)
);

module.exports = router;
