import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPurchaseItem extends Document {
    purchaseId: string;
    productId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    createdAt: Date;
    updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
    {
        purchaseId: {
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

        unitCost: {
            type: Number,
            required: true,
            min: 0,
        },

        totalCost: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
        collection: "purchaseItems",
    }
);

/*
 * Common lookup:
 * all items belonging to a particular purchase.
 */
purchaseItemSchema.index({
    purchaseId: 1,
});

/*
 * Useful for product purchase history
 * and inventory reports.
 */
purchaseItemSchema.index({
    productId: 1,
});

/*
 * Useful when retrieving a particular product
 * within a particular purchase.
 */
purchaseItemSchema.index({
    purchaseId: 1,
    productId: 1,
});

const PurchaseItem: Model<IPurchaseItem> =
    mongoose.models.PurchaseItem ||
    mongoose.model<IPurchaseItem>(
        "PurchaseItem",
        purchaseItemSchema
    );

export default PurchaseItem;
