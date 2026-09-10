import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import Purchase from "../models/Purchase.js";
import Expense from "../models/Expense.js";

export async function getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    /*
     * Fetch the core dashboard data in parallel.
     *
     * MongoDB replaces the previous Prisma
     * count/findMany/aggregate operations.
     */

    const [
        activeProducts,
        allProducts,
        totalCustomers,
        todaySales,
        totalRevenue,
        totalPurchases,
        totalExpenses,
    ] = await Promise.all([
        /*
         * Active products
         */
        Product.countDocuments({
            status: "Active",
        }),

        /*
         * Active products used for:
         * - low-stock calculation
         * - inventory value
         */
        Product.find({
            status: "Active",
        })
            .select(
                "quantity reorderLevel costPrice"
            )
            .lean(),

        /*
         * Total customers
         */
        Customer.countDocuments({}),

        /*
         * Today's completed sales
         */
        Sale.aggregate([
            {
                $match: {
                    saleDate: {
                        $gte: startOfToday,
                    },

                    saleStatus:
                        "Completed",
                },
            },

            {
                $group: {
                    _id: null,

                    totalAmount: {
                        $sum: "$totalAmount",
                    },
                },
            },
        ]),

        /*
         * All completed sales / revenue
         */
        Sale.aggregate([
            {
                $match: {
                    saleStatus:
                        "Completed",
                },
            },

            {
                $group: {
                    _id: null,

                    totalAmount: {
                        $sum: "$totalAmount",
                    },
                },
            },
        ]),

        /*
         * All completed purchases
         */
        Purchase.aggregate([
            {
                $match: {
                    purchaseStatus:
                        "Completed",
                },
            },

            {
                $group: {
                    _id: null,

                    totalAmount: {
                        $sum: "$totalAmount",
                    },
                },
            },
        ]),

        /*
         * All expenses
         */
        Expense.aggregate([
            {
                $group: {
                    _id: null,

                    amount: {
                        $sum: "$amount",
                    },
                },
            },
        ]),
    ]);

    /*
     * Calculate low-stock products.
     *
     * A product is considered low stock when
     * quantity <= reorderLevel.
     */

    const lowStock =
        allProducts.filter(
            (product) =>
                Number(
                    product.quantity
                ) <=
                Number(
                    product.reorderLevel
                )
        ).length;

    /*
     * Calculate total inventory value.
     *
     * Inventory value =
     * cost price × current quantity
     */

    const stockValue =
        allProducts.reduce(
            (total, product) =>
                total +
                Number(
                    product.costPrice
                ) *
                Number(
                    product.quantity
                ),
            0
        );

    /*
     * MongoDB aggregation returns
     * an array, unlike Prisma's _sum object.
     */

    const todaySalesAmount =
        Number(
            todaySales?.[0]
                ?.totalAmount ?? 0
        );

    const revenue =
        Number(
            totalRevenue?.[0]
                ?.totalAmount ?? 0
        );

    const purchases =
        Number(
            totalPurchases?.[0]
                ?.totalAmount ?? 0
        );

    const expenses =
        Number(
            totalExpenses?.[0]
                ?.amount ?? 0
        );

    /*
     * Revenue - purchases - expenses
     */

    const estimatedPosition =
        revenue -
        purchases -
        expenses;

    /*
     * Preserve the existing dashboard
     * response structure so the frontend
     * does not need to be changed.
     */

    return {
        /*
         * Product information
         */
        products:
            activeProducts,

        activeProducts,

        lowStock,

        stockValue,

        /*
         * Customer information
         */
        customers:
            totalCustomers,

        /*
         * Sales / revenue
         */
        todaySales:
            todaySalesAmount,

        revenue,

        /*
         * Purchases
         */
        purchases,

        /*
         * Expenses
         */
        expenses,

        /*
         * Financial position
         */
        estimatedPosition,

        estimatedGrossPosition:
            estimatedPosition,
    };
}
