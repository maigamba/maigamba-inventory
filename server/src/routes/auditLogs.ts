import { Router } from "express";
import { prisma } from "../config/database";
import {
    authenticate,
    requirePermission,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| AUDIT LOG ROUTES
|--------------------------------------------------------------------------
|
| Permission:
|
| audit.view
|
*/


// ============================================================================
// GET AUDIT LOGS
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("audit.view"),
    async (req, res, next) => {
        try {
            const logs = await prisma.auditLog.findMany({
                include: {
                    user: {
                        select: {
                            userId: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },

                orderBy: {
                    timestamp: "desc",
                },
            });

            res.json({
                success: true,
                data: logs,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;