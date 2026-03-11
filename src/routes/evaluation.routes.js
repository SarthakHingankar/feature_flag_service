const { Router } = require("express");
const evaluationController = require("../controllers/evaluation.controller");

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", asyncHandler(evaluationController.getConfig));

module.exports = router;
