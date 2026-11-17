require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("node:path");

const app = express();
const port = process.env.PORT || 3012;
const clientDist = path.join(__dirname, "..", "client", "dist");

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set.");
}

const taskSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, maxlength: 160 },
    completed: { type: Boolean, default: false }
}, { timestamps: true });

const Task = mongoose.model("Task", taskSchema);

app.use(express.json({ limit: "10kb" }));

app.get("/api/tasks", async (request, response, next) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 }).select("text completed createdAt");
        return response.json(tasks);
    } catch (error) {
        return next(error);
    }
});

app.post("/api/tasks", async (request, response, next) => {
    try {
        const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
        if (!text || text.length > 160) {
            return response.status(400).json({ error: "Task text must be between 1 and 160 characters." });
        }
        const task = await Task.create({ text });
        return response.status(201).json(task);
    } catch (error) {
        return next(error);
    }
});

app.patch("/api/tasks/:id", async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({ error: "Task ID is invalid." });
    }
    if (typeof request.body?.completed !== "boolean") {
        return response.status(400).json({ error: "Completed must be true or false." });
    }
    try {
        const task = await Task.findByIdAndUpdate(
            request.params.id,
            { completed: request.body.completed },
            { new: true, runValidators: true }
        );
        if (!task) {
            return response.status(404).json({ error: "Task not found." });
        }
        return response.json(task);
    } catch (error) {
        return next(error);
    }
});

app.delete("/api/tasks/:id", async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({ error: "Task ID is invalid." });
    }
    try {
        const task = await Task.findByIdAndDelete(request.params.id);
        if (!task) {
            return response.status(404).json({ error: "Task not found." });
        }
        return response.status(204).end();
    } catch (error) {
        return next(error);
    }
});

app.use("/api", (request, response) => {
    response.status(404).json({ error: "API route not found." });
});

app.use(express.static(clientDist));

app.get("*", (request, response, next) => {
    response.sendFile(path.join(clientDist, "index.html"), (error) => {
        if (error) next(error);
    });
});

app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return response.status(400).json({ error: "Request body must be valid JSON." });
    }
    console.error(error);
    return response.status(500).json({ error: "An unexpected server error occurred." });
});

async function start() {
    await mongoose.connect(process.env.MONGODB_URI);
    app.listen(port, () => console.log(`Experiment 12 is available at http://localhost:${port}`));
}

start().catch((error) => {
    console.error("Could not start Experiment 12:", error);
    process.exitCode = 1;
});
