import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

/* ============================================================================
   BUSINESS CONFIGURATION SCHEMA
============================================================================ */

const businessConfigSchema = z.object({
    body: z.object({
        SettingID: z.string().trim().max(100).optional(),

        BusinessName: z
            .string()
            .trim()
            .min(1)
            .max(150),

        Address: z
            .string()
            .trim()
            .max(300)
            .optional()
            .default(""),

        Phone: z
            .string()
            .trim()
            .max(50)
            .optional()
            .default(""),

        Email: z
            .string()
            .trim()
            .email()
            .max(254),

        Currency: z
            .string()
            .trim()
            .min(1)
            .max(10),

        CurrencySymbol: z
            .string()
            .trim()
            .min(1)
            .max(5),

        TaxRate: z
            .coerce
            .number()
            .finite()
            .min(0)
            .max(100),

        LowStockThreshold: z
            .coerce
            .number()
            .finite()
            .int()
            .min(1)
            .max(1000000),

        InvoicePrefix: z
            .string()
            .trim()
            .max(30)
            .optional()
            .default("INV-"),

        InvoiceFooterNote: z
            .string()
            .max(2000)
            .optional()
            .default(""),

        UpdatedAt: z
            .string()
            .trim()
            .max(50)
            .optional(),
    }),
});

/* ============================================================================
   SETTINGS ROUTES
============================================================================ */

/* ============================================================================
   GET ALL SETTINGS
============================================================================ */

router.get(
    "/",
    authenticate,
    requirePermission("settings.view"),
    async (_req, res, next) => {
        try {
            const settings = await prisma.setting.findMany({
                orderBy: {
                    settingName: "asc",
                },
            });

            res.json({
                success: true,
                data: settings,
            });
        } catch (error) {
            console.error(
                "[SETTINGS] FETCH ERROR:",
                error
            );

            next(error);
        }
    }
);

/* ============================================================================
   CREATE SETTING / SAVE BUSINESS CONFIGURATION
============================================================================ */

router.post(
    "/",
    authenticate,
    requirePermission("settings.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const body = req.body ?? {};

            /*
             * The frontend can send the complete business configuration
             * through POST /settings.
             */
            if (body.BusinessName !== undefined) {
                const parsed = businessConfigSchema.parse({
                    body,
                });

                const config = parsed.body;

                const values: Record<string, string> = {
                    BusinessName: config.BusinessName,
                    Address: config.Address ?? "",
                    Phone: config.Phone ?? "",
                    Email: config.Email,
                    Currency: config.Currency,
                    CurrencySymbol: config.CurrencySymbol,
                    TaxRate: String(config.TaxRate),
                    LowStockThreshold: String(
                        config.LowStockThreshold
                    ),
                    InvoicePrefix:
                        config.InvoicePrefix ?? "INV-",
                    InvoiceFooterNote:
                        config.InvoiceFooterNote ?? "",
                };

                const updated =
                    await prisma.$transaction(
                        async (tx) => {
                            const records = [];

                            for (
                                const [
                                    settingName,
                                    settingValue,
                                ] of Object.entries(values)
                            ) {
                                records.push(
                                    await tx.setting.upsert({
                                        where: {
                                            settingName,
                                        },

                                        create: {
                                            settingId:
                                                generateId(
                                                    "SET"
                                                ),
                                            settingName,
                                            settingValue,
                                        },

                                        update: {
                                            settingValue,
                                        },
                                    })
                                );
                            }

                            return records;
                        }
                    );

                try {
                    await createAuditLog({
                        userId: req.user?.userId,
                        action: "UPDATE",
                        module: "Settings",
                        recordId:
                            "SETTINGS_CONFIG",
                        description:
                            "Business configuration updated.",
                        ipAddress: req.ip,
                    });
                } catch (auditError) {
                    console.error(
                        "Failed to create settings audit log:",
                        auditError
                    );
                }

                res.json({
                    success: true,
                    message:
                        "Business settings updated successfully",
                    data: updated,
                });

                return;
            }

            /*
             * Otherwise preserve the original
             * single-setting API.
             */
            const {
                settingId,
                settingName,
                settingValue,
                description,
            } = body;

            const normalizedSettingName =
                String(settingName ?? "").trim();

            if (!normalizedSettingName) {
                res.status(400).json({
                    success: false,
                    message:
                        "Setting name is required",
                });

                return;
            }

            const existing =
                await prisma.setting.findFirst({
                    where: {
                        settingName:
                            normalizedSettingName,
                    },
                });

            if (existing) {
                res.status(409).json({
                    success: false,
                    message:
                        "A setting with this name already exists",
                });

                return;
            }

            const setting =
                await prisma.setting.create({
                    data: {
                        settingId:
                            settingId ||
                            generateId("SET"),

                        settingName:
                            normalizedSettingName,

                        settingValue:
                            settingValue !== undefined &&
                                settingValue !== null
                                ? String(settingValue)
                                : null,

                        description:
                            description
                                ? String(
                                    description
                                ).trim()
                                : null,
                    },
                });

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "CREATE",

                    module: "Settings",

                    recordId:
                        setting.settingId,

                    description:
                        `Setting ${setting.settingName} created.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create setting audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Setting created successfully",
                data: setting,
            });
        } catch (error) {
            console.error(
                "[SETTINGS] CREATE/CONFIG ERROR:",
                error
            );

            next(error);
        }
    }
);

/* ============================================================================
   UPDATE BUSINESS CONFIGURATION
============================================================================ */

/*
 * IMPORTANT:
 *
 * This route MUST appear before PUT "/:id".
 *
 * Without this route:
 *
 * PUT /settings/config
 *
 * gets interpreted as:
 *
 * PUT /settings/:id
 *
 * where id = "config".
 *
 * That caused:
 *
 * "Setting not found"
 */

router.put(
    "/config",
    authenticate,
    requirePermission("settings.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const parsed =
                businessConfigSchema.parse({
                    body: req.body ?? {},
                });

            const config = parsed.body;

            const values: Record<string, string> = {
                BusinessName:
                    config.BusinessName,

                Address:
                    config.Address ?? "",

                Phone:
                    config.Phone ?? "",

                Email:
                    config.Email,

                Currency:
                    config.Currency,

                CurrencySymbol:
                    config.CurrencySymbol,

                TaxRate:
                    String(config.TaxRate),

                LowStockThreshold:
                    String(
                        config.LowStockThreshold
                    ),

                InvoicePrefix:
                    config.InvoicePrefix ??
                    "INV-",

                InvoiceFooterNote:
                    config.InvoiceFooterNote ??
                    "",
            };

            const updated =
                await prisma.$transaction(
                    async (tx) => {
                        const records = [];

                        for (
                            const [
                                settingName,
                                settingValue,
                            ] of Object.entries(values)
                        ) {
                            records.push(
                                await tx.setting.upsert({
                                    where: {
                                        settingName,
                                    },

                                    create: {
                                        settingId:
                                            generateId(
                                                "SET"
                                            ),

                                        settingName,

                                        settingValue,
                                    },

                                    update: {
                                        settingValue,
                                    },
                                })
                            );
                        }

                        return records;
                    }
                );

            /*
             * Audit log
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "UPDATE",

                    module: "Settings",

                    recordId:
                        "SETTINGS_CONFIG",

                    description:
                        "Business configuration updated.",

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create settings audit log:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Business settings updated successfully",

                data: updated,
            });
        } catch (error) {
            console.error(
                "[SETTINGS] BUSINESS CONFIG UPDATE ERROR:",
                error
            );

            next(error);
        }
    }
);

/* ============================================================================
   UPDATE INDIVIDUAL SETTING
============================================================================ */

router.put(
    "/:id",
    authenticate,
    requirePermission("settings.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /*
             * Find existing setting
             */
            const existing =
                await prisma.setting.findUnique({
                    where: {
                        settingId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Setting not found",
                });

                return;
            }

            const {
                settingName,
                settingValue,
                description,
            } = req.body;

            /*
             * Build update data
             */
            const data: {
                settingName?: string;
                settingValue?: string | null;
                description?: string | null;
            } = {};

            /*
             * Update setting name
             */
            if (
                settingName !== undefined
            ) {
                const normalizedName =
                    String(
                        settingName
                    ).trim();

                if (!normalizedName) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Setting name cannot be empty",
                    });

                    return;
                }

                /*
                 * Check duplicate name
                 */
                const duplicate =
                    await prisma.setting.findFirst({
                        where: {
                            settingName:
                                normalizedName,

                            NOT: {
                                settingId:
                                    req.params.id,
                            },
                        },
                    });

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "A setting with this name already exists",
                    });

                    return;
                }

                data.settingName =
                    normalizedName;
            }

            /*
             * Update setting value
             */
            if (
                settingValue !== undefined
            ) {
                data.settingValue =
                    settingValue === null
                        ? null
                        : String(
                            settingValue
                        );
            }

            /*
             * Update description
             */
            if (
                description !== undefined
            ) {
                data.description =
                    description === null
                        ? null
                        : String(
                            description
                        ).trim() || null;
            }

            /*
             * Update database
             */
            const setting =
                await prisma.setting.update({
                    where: {
                        settingId:
                            req.params.id,
                    },

                    data,
                });

            /*
             * Audit trail
             */
            try {
                const changes: string[] =
                    [];

                if (
                    data.settingName !==
                    undefined
                ) {
                    changes.push(
                        `name (${existing.settingName} -> ${setting.settingName})`
                    );
                }

                if (
                    data.settingValue !==
                    undefined
                ) {
                    changes.push(
                        "value"
                    );
                }

                if (
                    data.description !==
                    undefined
                ) {
                    changes.push(
                        "description"
                    );
                }

                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "UPDATE",

                    module: "Settings",

                    recordId:
                        setting.settingId,

                    description:
                        `Setting ${setting.settingName} updated. Changed: ${changes.length > 0
                            ? changes.join(
                                ", "
                            )
                            : "No tracked fields"
                        }.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create setting update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Setting updated successfully",

                data: setting,
            });
        } catch (error) {
            console.error(
                "[SETTINGS] UPDATE ERROR:",
                error
            );

            next(error);
        }
    }
);

/* ============================================================================
   EXPORT ROUTER
============================================================================ */

export default router;