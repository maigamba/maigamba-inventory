import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            trim: true,
            default: undefined,
        },

        role: {
            type: String,
            required: true,
            default: "Sales Staff",

            trim: true,
        },

        status: {
            type: String,
            required: true,
            default: "Active",

            trim: true,
        },

        passwordHash: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "users",
    }
);

userSchema.index({
    fullName: 1,
});

userSchema.index({
    role: 1,
});

userSchema.index({
    status: 1,
});

const User: Model<IUser> =
    mongoose.models.User ||
    mongoose.model<IUser>(
        "User",
        userSchema
    );

export default User;
