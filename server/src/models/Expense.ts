import mongoose, { Document, Model, Schema } from "mongoose";

export interface IExpense extends Document {
    expenseId: string;
    expenseCategory: string;
    description?: string;
    amount: number;
    paymentMethod: string;
    expenseDate: Date;
    recordedBy: string;
    receipt?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
    {
        expenseId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        expenseCategory: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: undefined,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        paymentMethod: {
            type: String,
            required: true,
            default: "Cash",
            trim: true,
        },

        expenseDate: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },

        recordedBy: {
            type: String,
            required: true,
            trim: true,
        },

        receipt: {
            type: String,
            trim: true,
            default: undefined,
        },

        notes: {
            type: String,
            trim: true,
            default: undefined,
        },
    },
    {
        timestamps: true,
        collection: "expenses",
    }
);

expenseSchema.index({
    expenseCategory: 1,
    expenseDate: -1,
});

expenseSchema.index({
    expenseDate: -1,
});

expenseSchema.index({
    paymentMethod: 1,
});

expenseSchema.index({
    recordedBy: 1,
});

const Expense: Model<IExpense> =
    mongoose.models.Expense ||
    mongoose.model<IExpense>(
        "Expense",
        expenseSchema
    );

export default Expense;
