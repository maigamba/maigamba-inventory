import mongoose, { Schema, Model } from "mongoose";

export interface IReturn {
    returnId: string;
    saleId?: string;
    productId: string;
    serialNumber?: string;
    customerId?: string;
    returnDate: Date;
    reason: string;
    quantity: number;
    refundAmount: number;
    returnType?: string;
    conditionAfterReturn?: string;
    status?: string;
    restock: boolean;
    processedBy?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReturnSchema = new Schema<IReturn>(
    {
        returnId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        saleId: {
            type: String,
            index: true,
        },

        productId: {
            type: String,
            required: true,
            index: true,
        },

        serialNumber: {
            type: String,
            index: true,
        },

        customerId: {
            type: String,
            index: true,
        },

        returnDate: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        refundAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        returnType: {
            type: String,
            trim: true,
            default: "Customer Return",
        },

        conditionAfterReturn: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            trim: true,
            default: "Completed",
            index: true,
        },

        restock: {
            type: Boolean,
            required: true,
            default: false,
        },

        processedBy: {
            type: String,
            index: true,
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "returns",
    }
);

ReturnSchema.index({
    returnDate: -1,
});

ReturnSchema.index({
    customerId: 1,
    returnDate: -1,
});

ReturnSchema.index({
    productId: 1,
    returnDate: -1,
});

const Return: Model<IReturn> =
    mongoose.models.Return ||
    mongoose.model<IReturn>(
        "Return",
        ReturnSchema
    );

export default Return;
