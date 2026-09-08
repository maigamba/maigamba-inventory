import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const textField = (max: number) =>
    z.string().trim().max(max).optional().nullable();

const createExpenseSchema = z.object({
    body: z.object({
        expenseId: z.string().trim().max(100).optional(),
        expenseCategory: z.string().trim().min(1, "Expense category is required").max(100),
        description: textField(500),
        amount: z.coerce.number().finite().min(0).max(100000000000),
        paymentMethod: textField(50),
        expenseDate: z.string().trim().max(50).optional().nullable(),
        recordedBy: textField(100),
        receipt: textField(255),
        notes: textField(1000),
    }),
});

const updateExpenseSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Expense ID is required").max(100),
    }),
    body: z.object({
        expenseCategory: z.string().trim().min(1).max(100).optional(),
        description: textField(500),
        amount: z.coerce.number().finite().min(0).max(100000000000).optional(),
        paymentMethod: textField(50),
        expenseDate: z.string().trim().max(50).optional().nullable(),
        recordedBy: textField(100),
        receipt: textField(255),
        notes: textField(1000),
    }),
});

const expenseIdSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Expense ID is required").max(100),
    }),
});


/*
|--------------------------------------------------------------------------
| EXPENSE ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| expenses.view
| expenses.create
| expenses.update
| expenses.delete
|
*/


// ============================================================================
// GET ALL EXPENSES
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("expenses.view"),
    async (_req, res, next) => {
        try {
            const expenses =
                await prisma.expense.findMany({
                    orderBy: {
                        expenseDate: "desc",
                    },
                });

            res.json({
                success: true,
                data: expenses,
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


// ============================================================================
// CREATE EXPENSE
// ============================================================================

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
                recordedBy,
                receipt,
                notes,
            } = req.body;

            // --------------------------------------------------------------
            // Validate required fields
            // --------------------------------------------------------------

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

            // --------------------------------------------------------------
            // Validate amount
            // --------------------------------------------------------------

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

            // --------------------------------------------------------------
            // Resolve authenticated user
            // --------------------------------------------------------------

            const authenticatedUserId =
                String(
                    req.user?.userId ??
                    req.user?.id ??
                    ""
                ).trim();

            const finalRecordedBy =
                authenticatedUserId || null;

            // --------------------------------------------------------------
            // Create expense
            // --------------------------------------------------------------

            const expense =
                await prisma.expense.create({
                    data: {
                        expenseId:
                            expenseId ||
                            generateId("EXP"),

                        expenseCategory,

                        description:
                            description ||
                            null,

                        amount:
                            numericAmount,

                        paymentMethod:
                            paymentMethod ||
                            null,

                        expenseDate:
                            expenseDate
                                ? new Date(
                                    expenseDate
                                )
                                : new Date(),

                        recordedBy:
                            finalRecordedBy,

                        receipt:
                            receipt ||
                            null,

                        notes:
                            notes ||
                            null,
                    },
                });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

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
                data: expense,
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


// ============================================================================
// UPDATE EXPENSE
// ============================================================================

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
            // --------------------------------------------------------------
            // Find existing expense
            // --------------------------------------------------------------

            const existing =
                await prisma.expense.findUnique({
                    where: {
                        expenseId:
                            req.params.id,
                    },
                });

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
                recordedBy,
                receipt,
                notes,
            } = req.body;

            // --------------------------------------------------------------
            // Build update object
            // --------------------------------------------------------------

            const data: any = {};

            if (
                expenseCategory !==
                undefined
            ) {
                data.expenseCategory =
                    expenseCategory;
            }

            if (
                description !==
                undefined
            ) {
                data.description =
                    description;
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
                    paymentMethod;
            }

            if (
                expenseDate !==
                undefined
            ) {
                const parsedDate =
                    new Date(
                        expenseDate
                    );

                if (
                    Number.isNaN(
                        parsedDate.getTime()
                    )
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "expenseDate must be a valid date",
                    });

                    return;
                }

                data.expenseDate =
                    parsedDate;
            }

            // Do not allow the client to change the recorded-by identity.
            // The authenticated user remains authoritative.
            if (req.user?.userId) {
                data.recordedBy = req.user.userId;
            }

            if (
                receipt !==
                undefined
            ) {
                data.receipt =
                    receipt;
            }

            if (
                notes !==
                undefined
            ) {
                data.notes =
                    notes;
            }

            // --------------------------------------------------------------
            // Update expense
            // --------------------------------------------------------------

            const expense =
                await prisma.expense.update({
                    where: {
                        expenseId:
                            req.params.id,
                    },

                    data,
                });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

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
                data: expense,
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


// ============================================================================
// DELETE EXPENSE
// ============================================================================

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
            // --------------------------------------------------------------
            // Find existing expense
            // --------------------------------------------------------------

            const existing =
                await prisma.expense.findUnique({
                    where: {
                        expenseId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Expense not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete expense
            // --------------------------------------------------------------

            await prisma.expense.delete({
                where: {
                    expenseId:
                        req.params.id,
                },
            });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

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


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;