import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { prisma } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import { seedPermissions } from "./services/permission.service";

// Routes
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import categoriesRouter from "./routes/categories";
import brandsRouter from "./routes/brands";
import suppliersRouter from "./routes/suppliers";
import customersRouter from "./routes/customers";
import salesRouter from "./routes/sales";
import purchasesRouter from "./routes/purchases";
import expensesRouter from "./routes/expenses";
import returnsRouter from "./routes/returns";
import stockRouter from "./routes/stock";
import usersRouter from "./routes/users";
import settingsRouter from "./routes/settings";
import dashboardRouter from "./routes/dashboard";
import auditLogsRouter from "./routes/auditLogs";

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";

// --------------------------------------------------
// Trusted frontend origins
// --------------------------------------------------

const allowedOrigins = (process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions: cors.CorsOptions = {
    credentials: true,
    origin(origin, callback) {
        // Allow requests without an Origin header.
        // This includes health checks and some server-to-server requests.
        if (!origin) {
            callback(null, true);
            return;
        }

        // Development convenience.
        if (!isProduction && allowedOrigins.length === 0) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Origin not allowed by CORS"));
    },
};

// --------------------------------------------------
// Security middleware
// --------------------------------------------------

app.disable("x-powered-by");

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);

app.use(cors(corsOptions));

app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(
    express.urlencoded({
        extended: false,
        limit: "1mb",
    })
);

// --------------------------------------------------
// Global rate limiter
// --------------------------------------------------

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

app.use("/api", globalLimiter);

// --------------------------------------------------
// Login rate limiter
// --------------------------------------------------

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message:
            "Too many login attempts. Please wait and try again.",
    },
});

// --------------------------------------------------
// Basic API information
// --------------------------------------------------

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Maigamba Inventory API",
        version: "1.0.0",
        status: "running",
    });
});

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: "Maigamba Inventory API is running",
            database: "connected",
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

// --------------------------------------------------
// Public API routes
// --------------------------------------------------

app.use("/api/auth", loginLimiter, authRouter);

// --------------------------------------------------
// Protected API routes
// --------------------------------------------------

app.use("/api/products", authenticate, productsRouter);
app.use("/api/categories", authenticate, categoriesRouter);
app.use("/api/brands", authenticate, brandsRouter);
app.use("/api/suppliers", authenticate, suppliersRouter);
app.use("/api/customers", authenticate, customersRouter);
app.use("/api/sales", authenticate, salesRouter);
app.use("/api/purchases", authenticate, purchasesRouter);
app.use("/api/expenses", authenticate, expensesRouter);
app.use("/api/returns", authenticate, returnsRouter);
app.use("/api/stock", authenticate, stockRouter);
app.use("/api/users", authenticate, usersRouter);
app.use("/api/settings", authenticate, settingsRouter);
app.use("/api/dashboard", authenticate, dashboardRouter);
app.use("/api/audit-logs", authenticate, auditLogsRouter);
app.use("/api/auditLogs", authenticate, auditLogsRouter);

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// Start Server
// --------------------------------------------------

const server = app.listen(PORT, async () => {
    console.log("");
    console.log("==============================================");
    console.log("   MAIGAMBA INVENTORY API");
    console.log("==============================================");
    console.log(`Server:   http://localhost:${PORT}`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log("Database: PostgreSQL");
    console.log("Security: Helmet + CORS + Rate Limiting");
    console.log("==============================================");
    console.log("");

    try {
        const permissionCount = await seedPermissions();

        console.log(
            `Permissions seeded successfully: ${permissionCount}`
        );
    } catch (error) {
        console.error(
            "Failed to seed permissions:",
            error
        );
    }

    console.log("");
});

// --------------------------------------------------
// Graceful Shutdown
// --------------------------------------------------

async function shutdown(signal: string) {
    console.log(
        `${signal} received. Shutting down server...`
    );

    server.close(async () => {
        try {
            await prisma.$disconnect();

            console.log("Database disconnected.");
            console.log("Server stopped.");

            process.exit(0);
        } catch (error) {
            console.error(
                "Error during shutdown:",
                error
            );

            process.exit(1);
        }
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});