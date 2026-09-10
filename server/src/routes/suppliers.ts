import { Router } from "express";
import Supplier from "../models/Supplier";
import Product from "../models/Product";
import Purchase from "../models/Purchase";
import { generateMongoId } from "../utils/mongoId";
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
| MongoDB / Mongoose version
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
 * Remove MongoDB internal fields from API responses.
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
 * Escape a value before using it in a MongoDB regex.
 */
function escapeRegex(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

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

            let query: any = {};

            if (search) {
                const regex = new RegExp(
                    escapeRegex(search),
                    "i"
                );

                query = {
                    $or: [
                        {
                            supplierName:
                                regex,
                        },
                        {
                            supplierId:
                                regex,
                        },
                        {
                            phone: regex,
                        },
                        {
                            email: regex,
                        },
                    ],
                };
            }

            const suppliers =
                await Supplier.find(query)
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            res.json({
                success: true,
                data: suppliers.map(
                    cleanDocument
                ),
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
                await Supplier.findOne({
                    supplierId:
                        req.params.id,
                }).lean();

            if (!supplier) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            /**
             * MongoDB does not have Prisma's relational include.
             *
             * Resolve products and purchases using the supplierId.
             */
            const [
                products,
                purchases,
            ] = await Promise.all([
                Product.find({
                    supplierId:
                        supplier.supplierId,
                })
                    .sort({
                        createdAt: -1,
                    })
                    .lean(),

                Purchase.find({
                    supplierId:
                        supplier.supplierId,
                })
                    .sort({
                        purchaseDate: -1,
                    })
                    .lean(),
            ]);

            res.json({
                success: true,
                data: {
                    ...cleanDocument(
                        supplier
                    ),

                    products:
                        products.map(
                            cleanDocument
                        ),

                    purchases:
                        purchases.map(
                            cleanDocument
                        ),
                },
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

            /**
             * Validate supplier name.
             */
            if (
                !supplierName ||
                !String(supplierName).trim()
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Supplier name is required",
                });

                return;
            }

            const normalizedSupplierName =
                String(
                    supplierName
                ).trim();

            /**
             * Validate account balance.
             */
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

            /**
             * Create supplier.
             */
            const supplier =
                await Supplier.create({
                    supplierId:
                        generateMongoId(
                            "SUP"
                        ),

                    supplierName:
                        normalizedSupplierName,

                    contactPerson:
                        contactPerson !==
                            undefined
                            ? String(
                                contactPerson
                            ).trim()
                            : undefined,

                    phone:
                        phone !== undefined
                            ? String(
                                phone
                            ).trim()
                            : undefined,

                    email:
                        email !== undefined
                            ? String(
                                email
                            )
                                .trim()
                                .toLowerCase()
                            : undefined,

                    address:
                        address !==
                            undefined
                            ? String(
                                address
                            ).trim()
                            : undefined,

                    city:
                        city !== undefined
                            ? String(
                                city
                            ).trim()
                            : undefined,

                    accountBalance:
                        numericAccountBalance,

                    status:
                        String(
                            status || "Active"
                        ).trim(),
                });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} created. Phone: ${supplier.phone || "N/A"}, email: ${supplier.email || "N/A"}, account balance: ${supplier.accountBalance}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    supplier.toObject()
                ),
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
            /**
             * Find existing supplier.
             */
            const existing =
                await Supplier.findOne({
                    supplierId:
                        req.params.id,
                }).lean();

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

            /**
             * Build update data.
             */
            const updateData: Record<
                string,
                unknown
            > = {};

            if (
                supplierName !==
                undefined
            ) {
                if (
                    !String(
                        supplierName
                    ).trim()
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Supplier name is required",
                    });

                    return;
                }

                updateData.supplierName =
                    String(
                        supplierName
                    ).trim();
            }

            if (
                contactPerson !==
                undefined
            ) {
                updateData.contactPerson =
                    String(
                        contactPerson
                    ).trim();
            }

            if (phone !== undefined) {
                updateData.phone =
                    String(phone).trim();
            }

            if (email !== undefined) {
                updateData.email =
                    String(email)
                        .trim()
                        .toLowerCase();
            }

            if (address !== undefined) {
                updateData.address =
                    String(
                        address
                    ).trim();
            }

            if (city !== undefined) {
                updateData.city =
                    String(city).trim();
            }

            if (status !== undefined) {
                updateData.status =
                    String(status).trim();
            }

            /**
             * Validate account balance.
             */
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

            /**
             * Update supplier.
             */
            const supplier =
                await Supplier.findOneAndUpdate(
                    {
                        supplierId:
                            req.params.id,
                    },
                    {
                        $set: updateData,
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!supplier) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} updated. Status: ${supplier.status}, account balance: ${supplier.accountBalance}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    supplier
                ),
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
            /**
             * Find existing supplier.
             */
            const existing =
                await Supplier.findOne({
                    supplierId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            /**
             * Archive supplier.
             */
            const supplier =
                await Supplier.findOneAndUpdate(
                    {
                        supplierId:
                            req.params.id,
                    },
                    {
                        $set: {
                            status: "Inactive",
                        },
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!supplier) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "ARCHIVE",

                    module:
                        "Suppliers",

                    recordId:
                        supplier.supplierId,

                    description:
                        `Supplier ${supplier.supplierName} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    supplier
                ),
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
            /**
             * Find existing supplier.
             */
            const existing =
                await Supplier.findOne({
                    supplierId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found",
                });

                return;
            }

            /**
             * Delete supplier.
             */
            await Supplier.deleteOne({
                supplierId:
                    req.params.id,
            });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DELETE",

                    module:
                        "Suppliers",

                    recordId:
                        existing.supplierId,

                    description:
                        `Supplier ${existing.supplierName} deleted. Phone: ${existing.phone || "N/A"}, email: ${existing.email || "N/A"}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
