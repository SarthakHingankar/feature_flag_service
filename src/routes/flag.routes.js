const { Router } = require("express");
const flagController = require("../controllers/flag.controller");

const router = Router();

// Express 4 does not forward rejected promises to error middleware.
// Wrap async handlers so thrown / rejected errors reach errorHandler.
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.post(
    "/:projectId/environments/:envId/flags",
    asyncHandler(flagController.createFlag)
);

router.get(
    "/:projectId/environments/:envId/flags",
    asyncHandler(flagController.listFlags)
);

router.patch(
    "/:projectId/environments/:envId/flags/:flagId",
    asyncHandler(flagController.updateFlag)
);

module.exports = router;
