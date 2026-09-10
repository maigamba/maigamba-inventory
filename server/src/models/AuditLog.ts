import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
    logId: string;
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    description?: string;
    ipAddress?: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        logId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        userId: {
            type: String,
            index: true,
            trim: true,
            default: undefined,
        },

        action: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        module: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        recordId: {
            type: String,

            trim: true,
            default: undefined,
        },

        description: {
            type: String,
            trim: true,
            default: undefined,
        },

        ipAddress: {
            type: String,
            trim: true,
            default: undefined,
        },

        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "auditLogs",
    }
);

auditLogSchema.index({
    timestamp: -1,
});

auditLogSchema.index({
    userId: 1,
    timestamp: -1,
});

auditLogSchema.index({
    module: 1,
    timestamp: -1,
});

auditLogSchema.index({
    action: 1,
    timestamp: -1,
});

auditLogSchema.index({
    recordId: 1,
});

const AuditLog: Model<IAuditLog> =
    mongoose.models.AuditLog ||
    mongoose.model<IAuditLog>(
        "AuditLog",
        auditLogSchema
    );

export default AuditLog;
