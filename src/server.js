const express = require("express");
const projectRoutes = require("./routes/project.routes");
const environmentRoutes = require("./routes/environment.routes");
const flagRoutes = require("./routes/flag.routes");
const evaluationRoutes = require("./routes/evaluation.routes");
const auditLogRoutes = require("./routes/audit-log.routes");
const errorHandler = require("./utils/error.middleware");
const { initializeSnapshot, startSnapshotRefreshLoop } = require("./runtime/snapshot");
const app = express();

app.use(express.json());

app.use("/projects", projectRoutes);
app.use("/projects", environmentRoutes);
app.use("/projects", flagRoutes);
app.use("/config", evaluationRoutes);
app.use("/audit-logs", auditLogRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use(errorHandler);

const SNAPSHOT_REFRESH_INTERVAL_MS = 30_000;

initializeSnapshot()
    .then(() => {
        startSnapshotRefreshLoop(SNAPSHOT_REFRESH_INTERVAL_MS);

        app.listen(3000, () => {
            console.log("Server running on port 3000");
        });
    })
    .catch((error) => {
        console.error("Failed to initialize snapshot:", error);
        process.exit(1);
    });
