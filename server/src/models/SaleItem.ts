import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISaleItem extends Document {
    saleId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
    {
        saleId: {
            type: String,
            required: true,

            trim: true,
        },

        productId: {
            type: String,
            required: true,

            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
        collection: "saleItems",
    }
);

/*
 * Common lookup:
 * all items belonging to a particular sale.
 */
saleItemSchema.index({
    saleId: 1,
});

/*
 * Useful for product sales history and reports.
 */
saleItemSchema.index({
    productId: 1,
});

/*
 * Useful when retrieving products sold
 * within a particular sale.
 */
saleItemSchema.index({
    saleId: 1,
    productId: 1,
});

const SaleItem: Model<ISaleItem> =
    mongoose.models.SaleItem ||
    mongoose.model<ISaleItem>(
        "SaleItem",
        saleItemSchema
    );

export default SaleItem;

