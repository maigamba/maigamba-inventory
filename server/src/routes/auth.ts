import { Router } from "express";
import { loginUser } from "../services/auth.service";
import { createAuditLog } from "../services/audit.service";
import { getUserPermissions } from "../services/permission.service";

const router = Router();

/*
|--------------------------------------------------------------------------
| AUTH ROUTES
|--------------------------------------------------------------------------
|
| POST /api/auth/login
|
| Successful logins are recorded in the audit trail.
| The login response also contains the user's effective permissions.
|
*/


// ============================================================================
// LOGIN
// ============================================================================

router.post(
    "/login",
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // ----------------------------------------------------------------
            // Validate request
            // ----------------------------------------------------------------

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Authenticate user
            // ----------------------------------------------------------------

            const result = await loginUser(
                email,
                password
            );

            // ----------------------------------------------------------------
            // Load effective permissions
            // ----------------------------------------------------------------

            const permissionResult =
                await getUserPermissions(
                    result.user.userId
                );

            // ----------------------------------------------------------------
            // Record successful login
            // ----------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        result.user.userId,

                    action:
                        "LOGIN",

                    module:
                        "Authentication",

                    recordId:
                        result.user.userId,

                    description:
                        `User ${result.user.fullName} logged in successfully.`,

                    ipAddress:
                        req.ip ||
                        req.socket.remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                // Audit logging must not prevent a valid user
                // from logging in.
                console.error(
                    "LOGIN AUDIT ERROR:",
                    auditError
                );
            }

            // ----------------------------------------------------------------
            // Successful login response
            // ----------------------------------------------------------------

            res.status(200).json({
                success: true,

                message:
                    "Login successful",

                data: {
                    user:
                        result.user,

                    token:
                        result.token,

                    expiresIn:
                        result.expiresIn,

                    permissions:
                        permissionResult.permissions,
                },
            });
        } catch (error) {
            // ----------------------------------------------------------------
            // Invalid credentials
            // ----------------------------------------------------------------

            if (
                error instanceof Error &&
                error.message ===
                "Invalid email or password"
            ) {
                res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Inactive account
            // ----------------------------------------------------------------

            if (
                error instanceof Error &&
                error.message ===
                "User account is inactive"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "User account is inactive",
                });

                return;
            }

            next(error);
        }
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;