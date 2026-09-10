import { Router } from "express";
import { z } from "zod";

import Setting from "../models/Setting.js";

import { generateMongoId } from "../utils/mongoId.js";
import { createAuditLog } from "../services/audit.service.js";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| BUSINESS CONFIGURATION SCHEMA
|--------------------------------------------------------------------------
*/

const businessConfigSchema = z.object({
    body: z.object({
        SettingID: z
            .string()
            .trim()
            .max(100)
            .optional(),

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

        TaxRate: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100),

        LowStockThreshold: z.coerce
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

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
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
 * Keep the API compatible with the old
 * PostgreSQL settingName field.
 *
 * MongoDB:
 *   settingKey
 *
 * API:
 *   settingName
 */
function formatSetting(
    setting: any
) {
    if (!setting) {
        return setting;
    }

    const cleaned =
        cleanDocument(setting);

    return {
        ...cleaned,

        settingName:
            cleaned.settingKey,

        settingValue:
            cleaned.settingValue ??
            null,

        description:
            cleaned.description ??
            null,
    };
}

/**
 * Convert a setting name received
 * from the frontend into the MongoDB key.
 */
function normalizeSettingName(
    value: unknown
) {
    return String(
        value ?? ""
    ).trim();
}

/**
 * ============================================================================
 * GET ALL SETTINGS
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("settings.view"),
    async (_req, res, next) => {
        try {
            const settings =
                await Setting.find({})
                    .sort({
                        settingKey: 1,
                    })
                    .lean();

            res.json({
                success: true,

                data: settings.map(
                    formatSetting
                ),
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

/*
|--------------------------------------------------------------------------
| CREATE SETTING / SAVE BUSINESS CONFIGURATION
|--------------------------------------------------------------------------
*/

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
            const body =
                req.body ?? {};

            /*
             * The frontend can send the complete
             * business configuration through POST /settings.
             */

            if (
                body.BusinessName !==
                undefined
            ) {
                const parsed =
                    businessConfigSchema.parse(
                        {
                            body,
                        }
                    );

                const config =
                    parsed.body;

                const values: Record<
                    string,
                    string
                > = {
                    BusinessName:
                        config.BusinessName,

                    Address:
                        config.Address ??
                        "",

                    Phone:
                        config.Phone ??
                        "",

                    Email:
                        config.Email,

                    Currency:
                        config.Currency,

                    CurrencySymbol:
                        config.CurrencySymbol,

                    TaxRate:
                        String(
                            config.TaxRate
                        ),

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

                const records: any[] =
                    [];

                /*
                 * Upsert each configuration
                 * setting individually.
                 */
                for (
                    const [
                        settingKey,
                        settingValue,
                    ] of Object.entries(
                        values
                    )
                ) {
                    const record =
                        await Setting.findOneAndUpdate(
                            {
                                settingKey,
                            },
                            {
                                $set: {
                                    settingValue,
                                },

                                $setOnInsert: {
                                    settingId:
                                        generateMongoId(
                                            "SET"
                                        ),
                                },
                            },
                            {
                                returnDocument: "after",
                                upsert: true,
                                runValidators:
                                    true,
                            }
                        ).lean();

                    if (record) {
                        records.push(
                            formatSetting(
                                record
                            )
                        );
                    }
                }

                try {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "UPDATE",

                        module:
                            "Settings",

                        recordId:
                            "SETTINGS_CONFIG",

                        description:
                            "Business configuration updated.",

                        ipAddress:
                            req.ip ||
                            req.socket
                                .remoteAddress ||
                            undefined,
                    });
                } catch (auditError) {
                    console.error(
                        "[SETTINGS] CONFIG AUDIT ERROR:",
                        auditError
                    );
                }

                res.json({
                    success: true,

                    message:
                        "Business settings updated successfully",

                    data: records,
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
                normalizeSettingName(
                    settingName
                );

            if (
                !normalizedSettingName
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Setting name is required",
                });

                return;
            }

            const existing =
                await Setting.findOne({
                    settingKey:
                        normalizedSettingName,
                }).lean();

            if (existing) {
                res.status(409).json({
                    success: false,
                    message:
                        "A setting with this name already exists",
                });

                return;
            }

            const finalSettingId =
                settingId &&
                    String(
                        settingId
                    ).trim()
                    ? String(
                        settingId
                    ).trim()
                    : generateMongoId(
                        "SET"
                    );

            const setting =
                await Setting.create({
                    settingId:
                        finalSettingId,

                    settingKey:
                        normalizedSettingName,

                    settingValue:
                        settingValue !==
                            undefined &&
                            settingValue !==
                            null
                            ? String(
                                settingValue
                            )
                            : undefined,

                    description:
                        description
                            ? String(
                                description
                            ).trim()
                            : undefined,
                });

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Settings",

                    recordId:
                        setting.settingId,

                    description:
                        `Setting ${setting.settingKey} created.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[SETTINGS] CREATE AUDIT ERROR:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,

                message:
                    "Setting created successfully",

                data: formatSetting(
                    setting.toObject()
                ),
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

/*
|--------------------------------------------------------------------------
| UPDATE BUSINESS CONFIGURATION
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This route MUST appear before PUT "/:id".
|
| Otherwise:
|
| PUT /settings/config
|
| would be interpreted as:
|
| PUT /settings/:id
|
| where id = "config".
|
|--------------------------------------------------------------------------
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
                businessConfigSchema.parse(
                    {
                        body:
                            req.body ??
                            {},
                    }
                );

            const config =
                parsed.body;

            const values: Record<
                string,
                string
            > = {
                BusinessName:
                    config.BusinessName,

                Address:
                    config.Address ??
                    "",

                Phone:
                    config.Phone ??
                    "",

                Email:
                    config.Email,

                Currency:
                    config.Currency,

                CurrencySymbol:
                    config.CurrencySymbol,

                TaxRate:
                    String(
                        config.TaxRate
                    ),

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

            const updated: any[] =
                [];

            for (
                const [
                    settingKey,
                    settingValue,
                ] of Object.entries(
                    values
                )
            ) {
                const record =
                    await Setting.findOneAndUpdate(
                        {
                            settingKey,
                        },
                        {
                            $set: {
                                settingValue,
                            },

                            $setOnInsert: {
                                settingId:
                                    generateMongoId(
                                        "SET"
                                    ),
                            },
                        },
                        {
                            returnDocument: "after",
                            upsert: true,
                            runValidators:
                                true,
                        }
                    ).lean();

                if (record) {
                    updated.push(
                        formatSetting(
                            record
                        )
                    );
                }
            }

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Settings",

                    recordId:
                        "SETTINGS_CONFIG",

                    description:
                        "Business configuration updated.",

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[SETTINGS] CONFIG UPDATE AUDIT ERROR:",
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

/*
|--------------------------------------------------------------------------
| UPDATE INDIVIDUAL SETTING
|--------------------------------------------------------------------------
*/

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
             * Find existing setting.
             */

            const existing =
                await Setting.findOne({
                    settingId:
                        req.params.id,
                }).lean();

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
            } = req.body ?? {};

            const data: Record<
                string,
                any
            > = {};

            /*
             * Update setting name.
             */

            if (
                settingName !==
                undefined
            ) {
                const normalizedName =
                    normalizeSettingName(
                        settingName
                    );

                if (
                    !normalizedName
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Setting name cannot be empty",
                    });

                    return;
                }

                const duplicate =
                    await Setting.findOne({
                        settingKey:
                            normalizedName,

                        settingId: {
                            $ne:
                                req.params.id,
                        },
                    }).lean();

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "A setting with this name already exists",
                    });

                    return;
                }

                data.settingKey =
                    normalizedName;
            }

            /*
             * Update setting value.
             */

            if (
                settingValue !==
                undefined
            ) {
                data.settingValue =
                    settingValue === null
                        ? undefined
                        : String(
                            settingValue
                        );
            }

            /*
             * Update description.
             */

            if (
                description !==
                undefined
            ) {
                data.description =
                    description === null
                        ? undefined
                        : String(
                            description
                        ).trim() ||
                        undefined;
            }

            /*
             * Update database.
             */

            const setting =
                await Setting.findOneAndUpdate(
                    {
                        settingId:
                            req.params.id,
                    },
                    {
                        $set: data,
                    },
                    {
                        returnDocument: "after",
                        runValidators:
                            true,
                    }
                ).lean();

            if (!setting) {
                res.status(404).json({
                    success: false,
                    message:
                        "Setting not found",
                });

                return;
            }

            /*
             * Audit trail.
             */

            try {
                const changes: string[] =
                    [];

                if (
                    data.settingKey !==
                    undefined
                ) {
                    changes.push(
                        `name (${existing.settingKey} -> ${setting.settingKey})`
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

                    action:
                        "UPDATE",

                    module:
                        "Settings",

                    recordId:
                        setting.settingId,

                    description:
                        `Setting ${setting.settingKey} updated. Changed: ${changes.length >
                            0
                            ? changes.join(
                                ", "
                            )
                            : "No tracked fields"
                        }.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[SETTINGS] UPDATE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Setting updated successfully",

                data: formatSetting(
                    setting
                ),
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

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

export default router;

