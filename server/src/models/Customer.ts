import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomer extends Document {
    customerId: string;
    customerName: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    customerType: string;
    accountBalance: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
    {
        customerId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        customerName: {
            type: String,
            required: true,
            trim: true,
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

        state: {
            type: String,
            trim: true,
            default: undefined,
        },

        country: {
            type: String,
            trim: true,
            default: "Nigeria",
        },

        customerType: {
            type: String,
            required: true,
            default: "Individual",
            trim: true,
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
        collection: "customers",
    }
);

customerSchema.index({
    customerName: 1,
});

customerSchema.index({
    phone: 1,
});

customerSchema.index({
    email: 1,
});

customerSchema.index({
    status: 1,
});

customerSchema.index({
    customerType: 1,
});

customerSchema.index({
    state: 1,
});

customerSchema.index({
    country: 1,
});

customerSchema.index({
    city: 1,
});

const Customer: Model<ICustomer> =
    mongoose.models.Customer ||
    mongoose.model<ICustomer>(
        "Customer",
        customerSchema
    );

export default Customer;