import { Router } from "express";

import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

import {
    authenticate,
    requirePermission,
} from "../middleware/auth.js";

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
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET AUDIT LOGS
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    requirePermission("audit.view"),
    async (req, res, next) => {
        try {
            const logs =
                await AuditLog.find({})
                    .sort({
                        timestamp: -1,
                    })
                    .lean();

            /*
             * Resolve users associated
             * with the audit logs.
             */

            const userIds =
                Array.from(
                    new Set(
                        logs
                            .map(
                                (log) =>
                                    log.userId
                            )
                            .filter(
                                (
                                    userId
                                ): userId is string =>
                                    Boolean(
                                        userId
                                    )
                            )
                    )
                );

            const users =
                userIds.length > 0
                    ? await User.find({
                        userId: {
                            $in:
                                userIds,
                        },
                    })
                        .select(
                            "userId fullName email"
                        )
                        .lean()
                    : [];

            const userMap =
                new Map<
                    string,
                    {
                        userId: string;
                        fullName: string;
                        email: string;
                    }
                >(
                    users.map(
                        (user) => [
                            user.userId,
                            {
                                userId:
                                    user.userId,

                                fullName:
                                    user.fullName,

                                email:
                                    user.email,
                            },
                        ]
                    )
                );

            /*
             * Preserve the old API shape:
             *
             * log.user = {
             *   userId,
             *   fullName,
             *   email
             * }
             */

            const formattedLogs =
                logs.map((log) => {
                    const user =
                        log.userId
                            ? userMap.get(
                                log.userId
                            )
                            : null;

                    return {
                        ...log,

                        user:
                            user ??
                            null,
                    };
                });

            res.json({
                success: true,
                data: formattedLogs,
            });
        } catch (error) {
            console.error(
                "[AUDIT LOGS] FETCH ERROR:",
                error
            );

            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

export default router;
