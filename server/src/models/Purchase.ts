import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPurchase extends Document {
    purchaseId: string;
    invoiceNumber: string;
    supplierId: string;
    purchaseDate: Date;
    subtotal: number;
    tax: number;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    paymentMethod: string;
    paymentStatus: string;
    purchaseStatus: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
    {
        purchaseId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        supplierId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        purchaseDate: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },

        subtotal: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        tax: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        amountPaid: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        balance: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        paymentMethod: {
            type: String,
            required: true,
            default: "Cash",
            trim: true,
        },

        paymentStatus: {
            type: String,
            required: true,
            default: "Pending",

            trim: true,
        },

        purchaseStatus: {
            type: String,
            required: true,
            default: "Completed",

            trim: true,
        },

        createdBy: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "purchases",
    }
);

purchaseSchema.index({
    supplierId: 1,
    purchaseDate: -1,
});

purchaseSchema.index({
    purchaseDate: -1,
});

purchaseSchema.index({
    paymentStatus: 1,
});

purchaseSchema.index({
    purchaseStatus: 1,
});

const Purchase: Model<IPurchase> =
    mongoose.models.Purchase ||
    mongoose.model<IPurchase>(
        "Purchase",
        purchaseSchema
    );

export default Purchase;
