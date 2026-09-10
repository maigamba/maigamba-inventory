import { z } from "zod";

const optionalText = z
    .string()
    .trim()
    .max(255);

const optionalNullableText = z
    .string()
    .trim()
    .max(255)
    .nullable()
    .optional();

// --------------------------------------------------
// CREATE PRODUCT
// --------------------------------------------------

export const createProductSchema = z.object({
    body: z.object({
        sku: z
            .string()
            .trim()
            .min(1, "SKU is required")
            .max(100, "SKU must be 100 characters or fewer"),

        productName: z
            .string()
            .trim()
            .min(1, "Product name is required")
            .max(
                255,
                "Product name must be 255 characters or fewer"
            ),

        categoryId: z
            .string()
            .trim()
            .min(1, "Category is required")
            .max(100),

        brandId: z
            .string()
            .trim()
            .min(1, "Brand is required")
            .max(100),

        model: optionalNullableText,

        serialNumber: optionalNullableText,

        description: z
            .string()
            .trim()
            .max(2000, "Description is too long")
            .optional()
            .nullable(),

        quantity: z
            .coerce
            .number()
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative")
            .max(1000000, "Quantity is too large")
            .default(0),

        reorderLevel: z
            .coerce
            .number()
            .int("Reorder level must be a whole number")
            .min(0, "Reorder level cannot be negative")
            .max(1000000, "Reorder level is too large")
            .default(5),

        costPrice: z
            .coerce
            .number()
            .finite("Cost price must be a valid number")
            .min(0, "Cost price cannot be negative")
            .max(100000000000, "Cost price is too large")
            .default(0),

        sellingPrice: z
            .coerce
            .number()
            .finite("Selling price must be a valid number")
            .min(0, "Selling price cannot be negative")
            .max(100000000000, "Selling price is too large")
            .default(0),

        supplierId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        location: optionalText.optional(),

        status: z
            .string()
            .trim()
            .max(50)
            .default("Active"),
    }),
});

// --------------------------------------------------
// UPDATE PRODUCT
// --------------------------------------------------

export const updateProductSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(1, "Product ID is required")
            .max(100),
    }),

    body: z.object({
        sku: z
            .string()
            .trim()
            .min(1, "SKU cannot be empty")
            .max(100)
            .optional(),

        productName: z
            .string()
            .trim()
            .min(1, "Product name cannot be empty")
            .max(255)
            .optional(),

        categoryId: z
            .string()
            .trim()
            .min(1, "Category cannot be empty")
            .max(100)
            .optional(),

        brandId: z
            .string()
            .trim()
            .min(1, "Brand cannot be empty")
            .max(100)
            .optional(),

        model: optionalNullableText,

        serialNumber: optionalNullableText,

        description: z
            .string()
            .trim()
            .max(2000, "Description is too long")
            .optional()
            .nullable(),

        quantity: z
            .coerce
            .number()
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative")
            .max(1000000, "Quantity is too large")
            .optional(),

        reorderLevel: z
            .coerce
            .number()
            .int("Reorder level must be a whole number")
            .min(0, "Reorder level cannot be negative")
            .max(1000000, "Reorder level is too large")
            .optional(),

        costPrice: z
            .coerce
            .number()
            .finite("Cost price must be a valid number")
            .min(0, "Cost price cannot be negative")
            .max(100000000000, "Cost price is too large")
            .optional(),

        sellingPrice: z
            .coerce
            .number()
            .finite("Selling price must be a valid number")
            .min(0, "Selling price cannot be negative")
            .max(100000000000, "Selling price is too large")
            .optional(),

        supplierId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        location: optionalText.optional(),

        status: z
            .string()
            .trim()
            .max(50)
            .optional(),
    }),
});

// --------------------------------------------------
// PRODUCT ID
// --------------------------------------------------

export const productIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(1, "Product ID is required")
            .max(100),
    }),
});

// --------------------------------------------------
// PRODUCT LIST / SEARCH
// --------------------------------------------------

export const productListSchema = z.object({
    query: z.object({
        search: z
            .string()
            .trim()
            .max(100, "Search term is too long")
            .optional(),
    }),
});
