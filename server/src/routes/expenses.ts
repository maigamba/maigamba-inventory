import { Router } from "express";
import { z } from "zod";

import Expense from "../models/Expense";
import User from "../models/User";

import { generateMongoId } from "../utils/mongoId";
import { createAuditLog } from "../services/audit.service";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

import { validate } from "../middleware/validate";

const router = Router();

/*
|--------------------------------------------------------------------------
| EXPENSE ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| expenses.view
| expenses.create
| expenses.update
| expenses.delete
|
*/

/**
 * ============================================================================
 * VALIDATION
 * ============================================================================
 */

const textField = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .nullable();

const createExpenseSchema = z.object({
    body: z.object({
        expenseId: z
            .string()
            .trim()
            .max(100)
            .optional(),

        expenseCategory: z
            .string()
            .trim()
            .min(
                1,
                "Expense category is required"
            )
            .max(100),

        description:
            textField(500),

        amount: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000),

        paymentMethod:
            textField(50),

        expenseDate: z
            .string()
            .trim()
            .max(50)
            .optional()
            .nullable(),

        recordedBy:
            textField(100),

        receipt:
            textField(255),

        notes:
            textField(1000),
    }),
});

const updateExpenseSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(
                1,
                "Expense ID is required"
            )
            .max(100),
    }),

    body: z.object({
        expenseCategory: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .optional(),

        description:
            textField(500),

        amount: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000)
            .optional(),

        paymentMethod:
            textField(50),

        expenseDate: z
            .string()
            .trim()
            .max(50)
            .optional()
            .nullable(),

        recordedBy:
            textField(100),

        receipt:
            textField(255),

        notes:
            textField(1000),
    }),
});

const expenseIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(
                1,
                "Expense ID is required"
            )
            .max(100),
    }),
});

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

/**
 * Remove MongoDB internal fields.
 */
function cleanDocument(document: any) {
    if (!document) {
        return document;
    }

    const {
        _id,
        __v,
        ...data
    } = document;

    return data;
}

/**
 * Parse and validate an expense date.
 */
function parseExpenseDate(
    value: unknown
): Date {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return new Date();
    }

    const parsedDate =
        new Date(
            String(value).trim()
        );

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        throw new Error(
            "expenseDate must be a valid date"
        );
    }

    return parsedDate;
}

/**
 * ============================================================================
 * GET ALL EXPENSES
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("expenses.view"),
    async (_req, res, next) => {
        try {
            const expenses =
                await Expense.find({})
                    .sort({
                        expenseDate: -1,
                    })
                    .lean();

            res.json({
                success: true,
                data: expenses.map(
                    cleanDocument
                ),
            });
        } catch (error) {
            console.error(
                "[EXPENSES] FETCH ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE EXPENSE
 * ============================================================================
 */

router.post(
    "/",
    authenticate,
    requirePermission("expenses.create"),
    validate(createExpenseSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                expenseId,
                expenseCategory,
                description,
                amount,
                paymentMethod,
                expenseDate,
                receipt,
                notes,
            } = req.body;

            /**
             * ---------------------------------------------------------------
             * Validate required fields
             * ---------------------------------------------------------------
             */

            if (
                !expenseCategory ||
                amount === undefined
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Expense category and amount are required",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Validate amount
             * ---------------------------------------------------------------
             */

            const numericAmount =
                Number(amount);

            if (
                !Number.isFinite(
                    numericAmount
                ) ||
                numericAmount < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Expense amount must be a valid non-negative number",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Resolve authenticated user
             * ---------------------------------------------------------------
             */

            const authenticatedUserId =
                String(
                    req.user?.userId ??
                    req.user?.id ??
                    ""
                ).trim();

            const finalRecordedBy =
                authenticatedUserId ||
                undefined;

            /**
             * If an authenticated user exists,
             * verify that the account exists.
             */
            if (
                finalRecordedBy
            ) {
                const user =
                    await User.findOne({
                        userId:
                            finalRecordedBy,
                    }).lean();

                if (!user) {
                    res.status(400).json({
                        success: false,
                        message:
                            "The authenticated user was not found in the database.",
                    });

                    return;
                }
            }

            /**
             * ---------------------------------------------------------------
             * Parse expense date
             * ---------------------------------------------------------------
             */

            let parsedExpenseDate:
                Date;

            try {
                parsedExpenseDate =
                    parseExpenseDate(
                        expenseDate
                    );
            } catch {
                res.status(400).json({
                    success: false,
                    message:
                        "expenseDate must be a valid date",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Create expense
             * ---------------------------------------------------------------
             */

            const finalExpenseId =
                expenseId &&
                    String(
                        expenseId
                    ).trim()
                    ? String(
                        expenseId
                    ).trim()
                    : generateMongoId(
                        "EXP"
                    );

            /**
             * Prevent duplicate expense IDs.
             */
            const existingExpense =
                await Expense.findOne({
                    expenseId:
                        finalExpenseId,
                }).lean();

            if (
                existingExpense
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "An expense with this ID already exists.",
                });

                return;
            }

            const expense =
                await Expense.create({
                    expenseId:
                        finalExpenseId,

                    expenseCategory:
                        String(
                            expenseCategory
                        ).trim(),

                    description:
                        description !==
                            undefined &&
                            description !==
                            null
                            ? String(
                                description
                            ).trim()
                            : undefined,

                    amount:
                        numericAmount,

                    paymentMethod:
                        paymentMethod !==
                            undefined &&
                            paymentMethod !==
                            null
                            ? String(
                                paymentMethod
                            ).trim()
                            : undefined,

                    expenseDate:
                        parsedExpenseDate,

                    recordedBy:
                        finalRecordedBy,

                    receipt:
                        receipt !==
                            undefined &&
                            receipt !== null
                            ? String(
                                receipt
                            ).trim()
                            : undefined,

                    notes:
                        notes !==
                            undefined &&
                            notes !== null
                            ? String(
                                notes
                            ).trim()
                            : undefined,
                });

            /**
             * ---------------------------------------------------------------
             * Audit log
             * ---------------------------------------------------------------
             */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Expenses",

                    recordId:
                        expense.expenseId,

                    description:
                        `Expense created: ${expense.expenseCategory}, amount ${expense.amount}, payment method ${expense.paymentMethod ?? "N/A"}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[EXPENSES] CREATE AUDIT ERROR:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,

                message:
                    "Expense created successfully",

                data: cleanDocument(
                    expense.toObject()
                ),
            });
        } catch (error) {
            console.error(
                "[EXPENSES] CREATE ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE EXPENSE
 * ============================================================================
 */

router.put(
    "/:id",
    authenticate,
    requirePermission("expenses.update"),
    validate(updateExpenseSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * ---------------------------------------------------------------
             * Find existing expense
             * ---------------------------------------------------------------
             */

            const existing =
                await Expense.findOne({
                    expenseId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Expense not found",
                });

                return;
            }

            const {
                expenseCategory,
                description,
                amount,
                paymentMethod,
                expenseDate,
                receipt,
                notes,
            } = req.body;

            /**
             * ---------------------------------------------------------------
             * Build update object
             * ---------------------------------------------------------------
             */

            const data: Record<
                string,
                unknown
            > = {};

            if (
                expenseCategory !==
                undefined
            ) {
                if (
                    !String(
                        expenseCategory
                    ).trim()
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Expense category is required",
                    });

                    return;
                }

                data.expenseCategory =
                    String(
                        expenseCategory
                    ).trim();
            }

            if (
                description !==
                undefined
            ) {
                data.description =
                    description === null
                        ? undefined
                        : String(
                            description
                        ).trim();
            }

            if (
                amount !==
                undefined
            ) {
                const numericAmount =
                    Number(amount);

                if (
                    !Number.isFinite(
                        numericAmount
                    ) ||
                    numericAmount < 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Expense amount must be a valid non-negative number",
                    });

                    return;
                }

                data.amount =
                    numericAmount;
            }

            if (
                paymentMethod !==
                undefined
            ) {
                data.paymentMethod =
                    paymentMethod === null
                        ? undefined
                        : String(
                            paymentMethod
                        ).trim();
            }

            if (
                expenseDate !==
                undefined
            ) {
                try {
                    data.expenseDate =
                        parseExpenseDate(
                            expenseDate
                        );
                } catch {
                    res.status(400).json({
                        success: false,
                        message:
                            "expenseDate must be a valid date",
                    });

                    return;
                }
            }

            /**
             * Do not allow the client to change
             * the recorded-by identity.
             *
             * The authenticated user remains
             * authoritative.
             */
            if (
                req.user?.userId
            ) {
                data.recordedBy =
                    req.user.userId;
            }

            if (
                receipt !==
                undefined
            ) {
                data.receipt =
                    receipt === null
                        ? undefined
                        : String(
                            receipt
                        ).trim();
            }

            if (
                notes !==
                undefined
            ) {
                data.notes =
                    notes === null
                        ? undefined
                        : String(
                            notes
                        ).trim();
            }

            /**
             * ---------------------------------------------------------------
             * Update expense
             * ---------------------------------------------------------------
             */

            const expense =
                await Expense.findOneAndUpdate(
                    {
                        expenseId:
                            req.params.id,
                    },
                    {
                        $set: data,
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!expense) {
                res.status(404).json({
                    success: false,
                    message:
                        "Expense not found",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Audit log
             * ---------------------------------------------------------------
             */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Expenses",

                    recordId:
                        expense.expenseId,

                    description:
                        `Expense updated: ${expense.expenseCategory}, amount ${expense.amount}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[EXPENSES] UPDATE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Expense updated successfully",

                data: cleanDocument(
                    expense
                ),
            });
        } catch (error) {
            console.error(
                "[EXPENSES] UPDATE ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE EXPENSE
 * ============================================================================
 */

router.delete(
    "/:id",
    authenticate,
    requirePermission("expenses.delete"),
    validate(expenseIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * ---------------------------------------------------------------
             * Find existing expense
             * ---------------------------------------------------------------
             */

            const existing =
                await Expense.findOne({
                    expenseId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Expense not found",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Delete expense
             * ---------------------------------------------------------------
             */

            await Expense.deleteOne({
                expenseId:
                    req.params.id,
            });

            /**
             * ---------------------------------------------------------------
             * Audit log
             * ---------------------------------------------------------------
             */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DELETE",

                    module:
                        "Expenses",

                    recordId:
                        existing.expenseId,

                    description:
                        `Expense deleted: ${existing.expenseCategory}, amount ${existing.amount}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[EXPENSES] DELETE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Expense deleted successfully",
            });
        } catch (error) {
            console.error(
                "[EXPENSES] DELETE ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * EXPORT ROUTER
 * ============================================================================
 */

export default router;
