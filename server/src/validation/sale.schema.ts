import { z } from "zod";

// --------------------------------------------------
// SALE ITEM
// --------------------------------------------------

const saleItemSchema = z.object({
    productId: z
        .string()
        .trim()
        .min(1, "Product ID is required")
        .max(100, "Product ID is too long"),

    quantity: z
        .coerce
        .number()
        .finite("Quantity must be a valid number")
        .int("Quantity must be a whole number")
        .min(1, "Quantity must be at least 1")
        .max(1000000, "Quantity is too large"),

    unitPrice: z
        .coerce
        .number()
        .finite("Unit price must be a valid number")
        .min(0, "Unit price cannot be negative")
        .max(
            100000000000,
            "Unit price is too large"
        ),

    discount: z
        .coerce
        .number()
        .finite("Item discount must be a valid number")
        .min(0, "Item discount cannot be negative")
        .max(
            100000000000,
            "Item discount is too large"
        ),
});

// --------------------------------------------------
// CREATE SALE
// --------------------------------------------------

export const createSaleSchema = z.object({
    body: z.object({
        customerId: z
            .string()
            .trim()
            .max(100, "Customer ID is too long")
            .optional(),

        // Backward compatibility with your older client payload.
        CustomerID: z
            .string()
            .trim()
            .max(100, "Customer ID is too long")
            .optional(),

        items: z
            .array(saleItemSchema)
            .min(
                1,
                "At least one sale item is required."
            )
            .max(
                500,
                "Too many sale items."
            ),

        discount: z
            .coerce
            .number()
            .finite(
                "Discount must be a valid number"
            )
            .min(
                0,
                "Discount cannot be negative"
            )
            .max(
                100000000000,
                "Discount is too large"
            )
            .default(0),

        // Backward compatibility with older payloads.
        Discount: z
            .coerce
            .number()
            .finite(
                "Discount must be a valid number"
            )
            .min(
                0,
                "Discount cannot be negative"
            )
            .max(
                100000000000,
                "Discount is too large"
            )
            .optional(),

        tax: z
            .coerce
            .number()
            .finite(
                "Tax must be a valid number"
            )
            .min(
                0,
                "Tax cannot be negative"
            )
            .max(
                100000000000,
                "Tax is too large"
            )
            .default(0),

        Tax: z
            .coerce
            .number()
            .finite(
                "Tax must be a valid number"
            )
            .min(
                0,
                "Tax cannot be negative"
            )
            .max(
                100000000000,
                "Tax is too large"
            )
            .optional(),

        amountPaid: z
            .coerce
            .number()
            .finite(
                "Amount paid must be a valid number"
            )
            .min(
                0,
                "Amount paid cannot be negative"
            )
            .max(
                100000000000,
                "Amount paid is too large"
            )
            .default(0),

        AmountPaid: z
            .coerce
            .number()
            .finite(
                "Amount paid must be a valid number"
            )
            .min(
                0,
                "Amount paid cannot be negative"
            )
            .max(
                100000000000,
                "Amount paid is too large"
            )
            .optional(),

        paymentMethod: z
            .string()
            .trim()
            .min(
                1,
                "Payment method is required"
            )
            .max(
                50,
                "Payment method is too long"
            )
            .default("Cash"),

        PaymentMethod: z
            .string()
            .trim()
            .min(
                1,
                "Payment method is required"
            )
            .max(
                50,
                "Payment method is too long"
            )
            .optional(),

        createdBy: z
            .string()
            .trim()
            .max(100)
            .optional(),

        CreatedBy: z
            .string()
            .trim()
            .max(100)
            .optional(),
    }),
});

// --------------------------------------------------
// SALE ID
// --------------------------------------------------

export const saleIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(1, "Sale ID is required")
            .max(100, "Sale ID is too long"),
    }),
});
