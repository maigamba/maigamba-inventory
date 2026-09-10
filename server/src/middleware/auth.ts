import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { hasPermission } from "../services/permission.service.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET is missing. Add a strong JWT_SECRET to your .env file."
    );
}

const JWT_ALGORITHM: jwt.Algorithm = "HS256";

export interface AuthenticatedUser {
    id: string;
    userId: string;
    email: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

interface MaigambaJwtPayload extends jwt.JwtPayload {
    userId: string;
    role: string;
    email: string;
}

function isValidJwtPayload(
    payload: string | jwt.JwtPayload
): payload is MaigambaJwtPayload {
    if (
        typeof payload !== "object" ||
        payload === null
    ) {
        return false;
    }

    return (
        typeof payload.sub === "string" &&
        typeof payload.userId === "string" &&
        typeof payload.email === "string" &&
        typeof payload.role === "string"
    );
}

/**
 * Verify JWT access token.
 *
 * Expected header:
 * Authorization: Bearer <token>
 */
export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authorization =
            req.headers.authorization;

        if (!authorization) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }

        const [scheme, token] =
            authorization.trim().split(/\s+/);

        if (
            !scheme ||
            scheme.toLowerCase() !== "bearer" ||
            !token
        ) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET,
            {
                algorithms: [JWT_ALGORITHM],
            }
        );

        if (!isValidJwtPayload(decoded)) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }

        req.user = {
            id: decoded.sub,
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        const jwtError = error as {
            name?: string;
            message?: string;
        };

        if (
            jwtError?.name ===
            "TokenExpiredError"
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Authentication token has expired. Please log in again.",
            });
            return;
        }

        if (
            jwtError?.name ===
            "JsonWebTokenError"
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Invalid authentication token.",
            });
            return;
        }

        next(error);
    }
}

/**
 * Role-based authorization.
 */
export function requireRole(
    ...allowedRoles: string[]
) {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }

        const userRole = String(
            req.user.role || ""
        )
            .trim()
            .toLowerCase();

        const hasRole = allowedRoles.some(
            (role) =>
                String(role || "")
                    .trim()
                    .toLowerCase() === userRole
        );

        if (!hasRole) {
            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to perform this action.",
            });
            return;
        }

        next();
    };
}

/**
 * Database-backed permission authorization.
 *
 * Permissions are now resolved from MongoDB.
 */
export function requirePermission(
    permission: string
) {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authentication required.",
                });
                return;
            }

            const normalizedPermission =
                String(permission || "").trim();

            if (!normalizedPermission) {
                res.status(403).json({
                    success: false,
                    message:
                        "No permission was specified for this request.",
                });
                return;
            }

            const allowed =
                await hasPermission(
                    req.user.userId,
                    normalizedPermission
                );

            if (!allowed) {
                res.status(403).json({
                    success: false,
                    message:
                        "You do not have permission to perform this action.",
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Require at least one of the supplied permissions.
 */
export function requireAnyPermission(
    ...permissions: string[]
) {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authentication required.",
                });
                return;
            }

            const normalizedPermissions =
                permissions
                    .map((permission) =>
                        String(permission || "").trim()
                    )
                    .filter(Boolean);

            if (
                normalizedPermissions.length === 0
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "No permissions were provided for this request.",
                });
                return;
            }

            for (
                const permission
                of normalizedPermissions
            ) {
                const allowed =
                    await hasPermission(
                        req.user.userId,
                        permission
                    );

                if (allowed) {
                    next();
                    return;
                }
            }

            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to perform this action.",
            });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Require all of the supplied permissions.
 */
export function requireAllPermissions(
    ...permissions: string[]
) {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authentication required.",
                });
                return;
            }

            const normalizedPermissions =
                permissions
                    .map((permission) =>
                        String(permission || "").trim()
                    )
                    .filter(Boolean);

            if (
                normalizedPermissions.length === 0
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "No permissions were provided for this request.",
                });
                return;
            }

            for (
                const permission
                of normalizedPermissions
            ) {
                const allowed =
                    await hasPermission(
                        req.user.userId,
                        permission
                    );

                if (!allowed) {
                    res.status(403).json({
                        success: false,
                        message:
                            "You do not have permission to perform this action.",
                    });
                    return;
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
