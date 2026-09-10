import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISale extends Document {
    saleId: string;
    invoiceNumber: string;
    customerId: string;
    saleDate: Date;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    paymentMethod: string;
    paymentStatus: string;
    saleStatus: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
    {
        saleId: {
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

        customerId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        saleDate: {
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

        discount: {
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

        saleStatus: {
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
        collection: "sales",
    }
);

saleSchema.index({
    customerId: 1,
    saleDate: -1,
});

saleSchema.index({
    saleDate: -1,
});

saleSchema.index({
    paymentStatus: 1,
});

saleSchema.index({
    saleStatus: 1,
});

const Sale: Model<ISale> =
    mongoose.models.Sale ||
    mongoose.model<ISale>(
        "Sale",
        saleSchema
    );

export default Sale;

