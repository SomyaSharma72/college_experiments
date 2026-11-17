require("dotenv").config();

const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const crypto = require("node:crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const path = require("node:path");

const app = express();
const port = process.env.PORT || 3012;
const clientDist = path.join(__dirname, "..", "client", "dist");
const tokenLifetimeSeconds = 15 * 60;
const cookieName = "experiment12_session";
const secret = process.env.JWT_SECRET;

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set.");
}
if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
    tokenId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true, expires: 0 }
});

const taskSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 160 },
    completed: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Task = mongoose.model("Task", taskSchema);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please try again later." }
});

function setSessionCookie(response, token) {
    response.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: tokenLifetimeSeconds * 1000,
        path: "/"
    });
}

async function requireAuth(request, response, next) {
    const token = request.cookies[cookieName];
    if (!token) {
        return response.status(401).json({ error: "Please sign in first." });
    }

    try {
        const claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
        if (typeof claims !== "object" || !mongoose.isValidObjectId(claims.sub) || !claims.jti) {
            return response.status(401).json({ error: "Your session is invalid. Please sign in again." });
        }
        const session = await Session.findOne({ tokenId: claims.jti, userId: claims.sub });
        if (!session) {
            return response.status(401).json({ error: "Your session has ended. Please sign in again." });
        }
        request.userId = claims.sub;
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return response.status(401).json({ error: "Your session has expired. Please sign in again." });
        }
        return next(error);
    }
}

async function createSession(user, response) {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + tokenLifetimeSeconds * 1000);
    await Session.create({ tokenId, userId: user._id, expiresAt });
    const token = jwt.sign({ sub: user.id, jti: tokenId }, secret, {
        algorithm: "HS256",
        expiresIn: tokenLifetimeSeconds
    });
    setSessionCookie(response, token);
}

app.post("/api/auth/register", authLimiter, async (request, response, next) => {
    try {
        const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return response.status(400).json({ error: "Enter a valid email address." });
        }
        if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
            return response.status(400).json({ error: "Password must be at least 8 characters and no more than 72 UTF-8 bytes." });
        }
        if (await User.exists({ email })) {
            return response.status(409).json({ error: "An account with that email already exists." });
        }

        const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12) });
        await createSession(user, response);
        return response.status(201).json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        if (error.code === 11000) {
            return response.status(409).json({ error: "An account with that email already exists." });
        }
        return next(error);
    }
});

app.post("/api/auth/login", authLimiter, async (request, response, next) => {
    try {
        const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return response.status(401).json({ error: "Email or password is incorrect." });
        }
        await createSession(user, response);
        return response.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        return next(error);
    }
});

app.get("/api/auth/me", requireAuth, async (request, response, next) => {
    try {
        const user = await User.findById(request.userId).select("email");
        if (!user) {
            return response.status(401).json({ error: "Account not found. Please sign in again." });
        }
        return response.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        return next(error);
    }
});

app.post("/api/auth/logout", async (request, response, next) => {
    const token = request.cookies[cookieName];
    response.clearCookie(cookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    });
    if (!token) {
        return response.status(204).end();
    }
    try {
        const claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
        if (typeof claims === "object" && claims.jti) {
            await Session.deleteOne({ tokenId: claims.jti });
        }
        return response.status(204).end();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return response.status(204).end();
        }
        return next(error);
    }
});

app.get("/health", (request, response) => {
    response.json({ status: "ok" });
});

app.get("/api/tasks", requireAuth, async (request, response, next) => {
    try {
        const tasks = await Task.find({ owner: request.userId }).sort({ createdAt: -1 }).select("text completed createdAt");
        return response.json(tasks);
    } catch (error) {
        return next(error);
    }
});

app.post("/api/tasks", requireAuth, async (request, response, next) => {
    try {
        const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
        if (!text || text.length > 160) {
            return response.status(400).json({ error: "Task text must be between 1 and 160 characters." });
        }
        const task = await Task.create({ owner: request.userId, text });
        return response.status(201).json(task);
    } catch (error) {
        return next(error);
    }
});

app.patch("/api/tasks/:id", requireAuth, async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({ error: "Task ID is invalid." });
    }
    if (typeof request.body?.completed !== "boolean") {
        return response.status(400).json({ error: "Completed must be true or false." });
    }
    try {
        const task = await Task.findOneAndUpdate(
            { _id: request.params.id, owner: request.userId },
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

app.delete("/api/tasks/:id", requireAuth, async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({ error: "Task ID is invalid." });
    }
    try {
        const task = await Task.findOneAndDelete({ _id: request.params.id, owner: request.userId });
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
