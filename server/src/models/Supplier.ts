import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISupplier extends Document {
    supplierId: string;
    supplierName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    accountBalance: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
    {
        supplierId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        supplierName: {
            type: String,
            required: true,
            trim: true,
        },

        contactPerson: {
            type: String,
            trim: true,
            default: undefined,
        },

        phone: {
            type: String,
            trim: true,
            default: undefined,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: undefined,
        },

        address: {
            type: String,
            trim: true,
            default: undefined,
        },

        city: {
            type: String,
            trim: true,
            default: undefined,
        },

        accountBalance: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            required: true,
            default: "Active",

            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "suppliers",
    }
);

supplierSchema.index({
    supplierName: 1,
});

supplierSchema.index({
    phone: 1,
});

supplierSchema.index({
    email: 1,
});

supplierSchema.index({
    status: 1,
});

const Supplier: Model<ISupplier> =
    mongoose.models.Supplier ||
    mongoose.model<ISupplier>(
        "Supplier",
        supplierSchema
    );

export default Supplier;

