import { Router } from "express";
import {
    authenticate,
    requirePermission,
} from "../middleware/auth.js";
import { getDashboard } from "../services/dashboard.service.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| DASHBOARD ROUTES
|--------------------------------------------------------------------------
|
| Permission:
|
| dashboard.view
|
*/


// ============================================================================
// GET DASHBOARD
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("dashboard.view"),
    async (_req, res, next) => {
        try {
            const dashboard =
                await getDashboard();

            res.json({
                success: true,
                data: dashboard,
            });
        } catch (error) {
            console.error(
                "[DASHBOARD] FETCH ERROR:",
                error
            );

            next(error);
        }
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;
