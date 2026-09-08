import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import {
    authenticate,
    requirePermission,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| CUSTOMERS ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| customers.view
| customers.create
| customers.update
| customers.delete
|
*/


// ============================================================================
// GET ALL CUSTOMERS
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("customers.view"),
    async (req, res, next) => {
        try {
            const search = String(
                req.query.search ?? ""
            ).trim();

            const customers =
                await prisma.customer.findMany({
                    where: search
                        ? {
                            OR: [
                                {
                                    customerName: {
                                        contains:
                                            search,
                                        mode:
                                            "insensitive",
                                    },
                                },
                                {
                                    customerId: {
                                        contains:
                                            search,
                                        mode:
                                            "insensitive",
                                    },
                                },
                                {
                                    phone: {
                                        contains:
                                            search,
                                        mode:
                                            "insensitive",
                                    },
                                },
                                {
                                    email: {
                                        contains:
                                            search,
                                        mode:
                                            "insensitive",
                                    },
                                },
                            ],
                        }
                        : undefined,

                    orderBy: {
                        createdAt: "desc",
                    },
                });

            res.json({
                success: true,
                data: customers,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// GET SINGLE CUSTOMER
// ============================================================================

router.get(
    "/:id",
    authenticate,
    requirePermission("customers.view"),
    async (req, res, next) => {
        try {
            const customer =
                await prisma.customer.findUnique({
                    where: {
                        customerId:
                            req.params.id,
                    },

                    include: {
                        sales: {
                            orderBy: {
                                saleDate: "desc",
                            },
                        },

                        returns: {
                            orderBy: {
                                returnDate: "desc",
                            },
                        },
                    },
                });

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });

                return;
            }

            res.json({
                success: true,
                data: customer,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// CREATE CUSTOMER
// ============================================================================

router.post(
    "/",
    authenticate,
    requirePermission("customers.create"),
    async (req, res, next) => {
        try {
            const {
                customerName,
                phone,
                email,
                address,
                customerType,
                accountBalance = 0,
                status = "Active",
            } = req.body;

            // --------------------------------------------------------------
            // Validate required fields
            // --------------------------------------------------------------

            if (!customerName) {
                res.status(400).json({
                    success: false,
                    message:
                        "Customer name is required",
                });

                return;
            }

            // --------------------------------------------------------------
            // Validate account balance
            // --------------------------------------------------------------

            const numericAccountBalance =
                Number(accountBalance);

            if (
                !Number.isFinite(
                    numericAccountBalance
                )
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Account balance must be a valid number",
                });

                return;
            }

            // --------------------------------------------------------------
            // Create customer
            // --------------------------------------------------------------

            const customer =
                await prisma.customer.create({
                    data: {
                        customerId:
                            generateId("CUS"),

                        customerName,

                        phone,

                        email,

                        address,

                        customerType,

                        accountBalance:
                            numericAccountBalance,

                        status,
                    },
                });

            res.status(201).json({
                success: true,
                message:
                    "Customer created successfully",
                data: customer,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// UPDATE CUSTOMER
// ============================================================================

router.put(
    "/:id",
    authenticate,
    requirePermission("customers.update"),
    async (req, res, next) => {
        try {
            // --------------------------------------------------------------
            // Find existing customer
            // --------------------------------------------------------------

            const existing =
                await prisma.customer.findUnique({
                    where: {
                        customerId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            const {
                customerName,
                phone,
                email,
                address,
                customerType,
                accountBalance,
                status,
            } = req.body;

            // --------------------------------------------------------------
            // Build update data
            // --------------------------------------------------------------

            const updateData: any = {
                ...(customerName !== undefined && {
                    customerName,
                }),

                ...(phone !== undefined && {
                    phone,
                }),

                ...(email !== undefined && {
                    email,
                }),

                ...(address !== undefined && {
                    address,
                }),

                ...(customerType !== undefined && {
                    customerType,
                }),

                ...(status !== undefined && {
                    status,
                }),
            };

            // --------------------------------------------------------------
            // Validate account balance when supplied
            // --------------------------------------------------------------

            if (
                accountBalance !==
                undefined
            ) {
                const numericAccountBalance =
                    Number(
                        accountBalance
                    );

                if (
                    !Number.isFinite(
                        numericAccountBalance
                    )
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Account balance must be a valid number",
                    });

                    return;
                }

                updateData.accountBalance =
                    numericAccountBalance;
            }

            // --------------------------------------------------------------
            // Update customer
            // --------------------------------------------------------------

            const customer =
                await prisma.customer.update({
                    where: {
                        customerId:
                            req.params.id,
                    },

                    data: updateData,
                });

            res.json({
                success: true,
                message:
                    "Customer updated successfully",
                data: customer,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// ARCHIVE CUSTOMER
// ============================================================================
//
// Archive is treated as an update because it changes the customer's status.
// Requires:
// customers.update
//

router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("customers.update"),
    async (req, res, next) => {
        try {
            // --------------------------------------------------------------
            // Find existing customer
            // --------------------------------------------------------------

            const existing =
                await prisma.customer.findUnique({
                    where: {
                        customerId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Archive customer
            // --------------------------------------------------------------

            const customer =
                await prisma.customer.update({
                    where: {
                        customerId:
                            req.params.id,
                    },

                    data: {
                        status: "Inactive",
                    },
                });

            res.json({
                success: true,
                message:
                    "Customer archived successfully",
                data: customer,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// DELETE CUSTOMER
// ============================================================================

router.delete(
    "/:id",
    authenticate,
    requirePermission("customers.delete"),
    async (req, res, next) => {
        try {
            // --------------------------------------------------------------
            // Find existing customer
            // --------------------------------------------------------------

            const existing =
                await prisma.customer.findUnique({
                    where: {
                        customerId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete customer
            // --------------------------------------------------------------

            await prisma.customer.delete({
                where: {
                    customerId:
                        req.params.id,
                },
            });

            res.json({
                success: true,
                message:
                    "Customer deleted successfully",
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