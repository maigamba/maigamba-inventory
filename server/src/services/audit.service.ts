import { prisma } from "../config/database";
import { generateId } from "../utils/ids";

interface AuditInput {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    description?: string;
    ipAddress?: string;
}

export async function createAuditLog(input: AuditInput) {
    return prisma.auditLog.create({
        data: {
            logId: generateId("LOG"),
            userId: input.userId || null,
            action: input.action,
            module: input.module,
            recordId: input.recordId || null,
            description: input.description || null,
            ipAddress: input.ipAddress || null,
        },
    });
}