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
const port = process.env.PORT || 3009;
const tokenLifetimeSeconds = 15 * 60;
const cookieName = "experiment9_session";
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}
if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set.");
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

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

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
        const claims = jwt.verify(token, secret);
        if (typeof claims !== "object" || !claims.sub || !claims.jti) {
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
    const token = jwt.sign({ sub: user.id, jti: tokenId }, secret, { expiresIn: tokenLifetimeSeconds });
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
    response.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
    if (!token) {
        return response.status(204).end();
    }
    try {
        const claims = jwt.verify(token, secret);
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

app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return response.status(400).json({ error: "Request body must be valid JSON." });
    }
    console.error(error);
    return response.status(500).json({ error: "An unexpected server error occurred." });
});

async function start() {
    await mongoose.connect(process.env.MONGODB_URI);
    app.listen(port, () => console.log(`Experiment 9 is available at http://localhost:${port}`));
}

start().catch((error) => {
    console.error("Could not start Experiment 9:", error);
    process.exitCode = 1;
});
