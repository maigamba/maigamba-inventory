import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISetting extends Document {
    settingId: string;
    settingKey: string;
    settingValue?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
    {
        settingId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        settingKey: {
            type: String,
            required: true,
            unique: true,

            trim: true,
        },

        settingValue: {
            type: String,
            default: undefined,
        },

        description: {
            type: String,
            trim: true,
            default: undefined,
        },
    },
    {
        timestamps: true,
        collection: "settings",
    }
);

const Setting: Model<ISetting> =
    mongoose.models.Setting ||
    mongoose.model<ISetting>(
        "Setting",
        settingSchema
    );

export default Setting;



