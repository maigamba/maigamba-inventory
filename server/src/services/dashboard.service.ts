import { prisma } from "../config/database";

export async function getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
        activeProducts,
        allProducts,
        totalCustomers,
        todaySales,
        totalRevenue,
        totalPurchases,
        totalExpenses,
    ] = await Promise.all([
        // Active products
        prisma.product.count({
            where: {
                status: "Active",
            },
        }),

        // Active products used for stock calculations
        prisma.product.findMany({
            where: {
                status: "Active",
            },
            select: {
                quantity: true,
                reorderLevel: true,
                costPrice: true,
            },
        }),

        // Total customers
        prisma.customer.count(),

        // Today's completed sales
        prisma.sale.aggregate({
            where: {
                saleDate: {
                    gte: startOfToday,
                },
                saleStatus: "Completed",
            },
            _sum: {
                totalAmount: true,
            },
        }),

        // All completed sales / revenue
        prisma.sale.aggregate({
            where: {
                saleStatus: "Completed",
            },
            _sum: {
                totalAmount: true,
            },
        }),

        // All completed purchases
        prisma.purchase.aggregate({
            where: {
                purchaseStatus: "Completed",
            },
            _sum: {
                totalAmount: true,
            },
        }),

        // All expenses
        prisma.expense.aggregate({
            _sum: {
                amount: true,
            },
        }),
    ]);

    // Calculate low-stock products
    const lowStock = allProducts.filter(
        (product) =>
            product.quantity <= product.reorderLevel
    ).length;

    // Calculate total inventory value
    const stockValue = allProducts.reduce(
        (total, product) =>
            total +
            Number(product.costPrice) *
            Number(product.quantity),
        0
    );

    // Convert database Decimal/null values to numbers
    const todaySalesAmount =
        Number(todaySales._sum.totalAmount ?? 0);

    const revenue =
        Number(totalRevenue._sum.totalAmount ?? 0);

    const purchases =
        Number(totalPurchases._sum.totalAmount ?? 0);

    const expenses =
        Number(totalExpenses._sum.amount ?? 0);

    // Revenue - purchases - expenses
    const estimatedPosition =
        revenue - purchases - expenses;

    return {
        // Product information
        products: activeProducts,
        activeProducts,
        lowStock,
        stockValue,

        // Customer information
        customers: totalCustomers,

        // Sales / revenue
        todaySales: todaySalesAmount,
        revenue,

        // Purchases
        purchases,

        // Expenses
        expenses,

        // Financial position
        estimatedPosition,
        estimatedGrossPosition: estimatedPosition,
    };
}