export function generateId(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
    const now = new Date();

    const date = now.toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    const time = now.toTimeString()
        .slice(0, 8)
        .replace(/:/g, "");

    const random = Math.floor(100 + Math.random() * 900);

    return `INV-${date}-${time}-${random}`;
}

export function generatePurchaseNumber(): string {
    const now = new Date();

    const date = now.toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    const time = now.toTimeString()
        .slice(0, 8)
        .replace(/:/g, "");

    const random = Math.floor(100 + Math.random() * 900);

    return `PUR-${date}-${time}-${random}`;
}