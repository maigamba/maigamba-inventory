import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| SUPPLIER ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| suppliers.view
| suppliers.create
| suppliers.update
| suppliers.delete
|
*/

/**
 * ============================================================================
 * GET ALL SUPPLIERS
 * ============================================================================
 */
router.get(
    "/",
    authenticate,
    requirePermission("suppliers.view"),
    async (req, res, next) => {
        try {
            const search = String(
                req.query.search ?? ""
            ).trim();

            const suppliers =
                await prisma.supplier.findMany({
                    where: search
                        ? {
                            OR: [
                                {
                                    supplierName: {
                                        contains:
                                            search,
                                        mode:
                                            "insensitive",
                                    },
                                },
                                {
                                    supplierId: {
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
                data: suppliers,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE SUPPLIER
 * ============================================================================
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("suppliers.view"),
    async (req, res, next) => {
        try {
            const supplier =
                await prisma.supplier.findUnique({
                    where: {
                        supplierId:
                            req.params.id,
                    },

                    include: {
                        products: true,

                        purchases: {
                            orderBy: {
                                purchaseDate:
                                    "desc",
                            },
                        },
                    },
                });

            if (!supplier) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            res.json({
                success: true,
                data: supplier,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE SUPPLIER
 * ============================================================================
 */
router.post(
    "/",
    authenticate,
    requirePermission("suppliers.create"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                supplierName,
                contactPerson,
                phone,
                email,
                address,
                city,
                accountBalance = 0,
                status = "Active",
            } = req.body;

            // --------------------------------------------------------------
            // Validate supplier name
            // --------------------------------------------------------------

            if (!supplierName) {
                res.status(400).json({
                    success: false,
                    message:
                        "Supplier name is required",
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
            // Create supplier
            // --------------------------------------------------------------

            const supplier =
                await prisma.supplier.create({
                    data: {
                        supplierId:
                            generateId("SUP"),

                        supplierName,

                        contactPerson,

                        phone,

                        email,

                        address,

                        city,

                        accountBalance:
                            numericAccountBalance,

                        status,
                    },
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "CREATE",

                    module: "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} created. Phone: ${supplier.phone || "N/A"}, email: ${supplier.email || "N/A"}, account balance: ${supplier.accountBalance}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create supplier audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Supplier created successfully",
                data: supplier,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE SUPPLIER
 * ============================================================================
 */
router.put(
    "/:id",
    authenticate,
    requirePermission("suppliers.update"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find existing supplier
            // --------------------------------------------------------------

            const existing =
                await prisma.supplier.findUnique({
                    where: {
                        supplierId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            const {
                supplierName,
                contactPerson,
                phone,
                email,
                address,
                city,
                accountBalance,
                status,
            } = req.body;

            // --------------------------------------------------------------
            // Build update data
            // --------------------------------------------------------------

            const data: any = {
                ...(supplierName !== undefined && {
                    supplierName,
                }),

                ...(contactPerson !== undefined && {
                    contactPerson,
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

                ...(city !== undefined && {
                    city,
                }),

                ...(status !== undefined && {
                    status,
                }),
            };

            // --------------------------------------------------------------
            // Validate account balance
            // --------------------------------------------------------------

            if (
                accountBalance !==
                undefined
            ) {
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

                data.accountBalance =
                    numericAccountBalance;
            }

            // --------------------------------------------------------------
            // Update supplier
            // --------------------------------------------------------------

            const supplier =
                await prisma.supplier.update({
                    where: {
                        supplierId:
                            req.params.id,
                    },

                    data,
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "UPDATE",

                    module: "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} updated. Status: ${supplier.status}, account balance: ${supplier.accountBalance}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create supplier update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Supplier updated successfully",
                data: supplier,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * ARCHIVE SUPPLIER
 * ============================================================================
 *
 * Archiving changes the supplier status, so it uses suppliers.update.
 * ============================================================================
 */
router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("suppliers.update"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find existing supplier
            // --------------------------------------------------------------

            const existing =
                await prisma.supplier.findUnique({
                    where: {
                        supplierId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Archive supplier
            // --------------------------------------------------------------

            const supplier =
                await prisma.supplier.update({
                    where: {
                        supplierId:
                            req.params.id,
                    },

                    data: {
                        status: "Inactive",
                    },
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "ARCHIVE",

                    module: "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create supplier archive audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Supplier archived successfully",
                data: supplier,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE SUPPLIER
 * ============================================================================
 */
router.delete(
    "/:id",
    authenticate,
    requirePermission("suppliers.delete"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find existing supplier
            // --------------------------------------------------------------

            const existing =
                await prisma.supplier.findUnique({
                    where: {
                        supplierId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete supplier
            // --------------------------------------------------------------

            await prisma.supplier.delete({
                where: {
                    supplierId:
                        req.params.id,
                },
            });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "DELETE",

                    module: "Suppliers",

                    recordId:
                        existing.supplierId,

                    description:
                        `Supplier ${existing.supplierName} deleted. Phone: ${existing.phone || "N/A"}, email: ${existing.email || "N/A"}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create supplier delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Supplier deleted successfully",
            });
        } catch (error) {
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