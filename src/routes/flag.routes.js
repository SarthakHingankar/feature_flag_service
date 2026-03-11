const { Router } = require("express");
const flagController = require("../controllers/flag.controller");

const router = Router();

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
