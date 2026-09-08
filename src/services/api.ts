const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "maigamba_inventory_token";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const token = getAuthToken();

    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
        signal: controller.signal,
      }
    );

    const text = await response.text();

    let result: ApiResponse<T>;

    try {
      result = text
        ? JSON.parse(text)
        : {
          success: response.ok,
        };
    } catch {
      result = {
        success: false,
        message:
          text || "Invalid response received from server.",
      };
    }

    if (response.status === 401) {
      clearAuthToken();

      window.dispatchEvent(
        new CustomEvent("maigamba-auth-expired")
      );

      throw new Error(
        result.message ||
        "Authentication required. Please log in again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        result.message ||
        "You do not have permission to perform this action."
      );
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
        `Request failed with status ${response.status}.`
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Request timed out. Please make sure the inventory server is running."
      );
    }

    if (
      error instanceof TypeError &&
      error.message === "Failed to fetch"
    ) {
      throw new Error(
        "Failed to fetch. Please make sure the inventory server is running and the API URL is correct."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/* =========================================================
   AUTHENTICATION
========================================================= */

async function login(
  email: string,
  password: string
) {
  const result = await request<{
    user: any;
    token: string;
    expiresIn: string;
    permissions: string[];
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (result.success && result.data?.token) {
    setAuthToken(result.data.token);
  }

  return result;
}

function logout(): void {
  clearAuthToken();
}

/* =========================================================
   DASHBOARD
========================================================= */

function getDashboard() {
  return request("/dashboard");
}

/* =========================================================
   PRODUCTS
========================================================= */

function getProducts(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/products${query}`);
}

function getProduct(id: string) {
  return request(
    `/products/${encodeURIComponent(id)}`
  );
}

function createProduct(data: any) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateProduct(
  id: string,
  data: any
) {
  return request(
    `/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function archiveProduct(id: string) {
  return request(
    `/products/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
    }
  );
}

function deleteProduct(id: string) {
  return request(
    `/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

function getCategories() {
  return request("/categories");
}

function getCategory(id: string) {
  return request(
    `/categories/${encodeURIComponent(id)}`
  );
}

function createCategory(
  data: {
    name: string;
    description?: string;
    status?: string;
  }
) {
  const name =
    String(data.name ?? "").trim();

  if (!name) {
    throw new Error(
      "Category name is required"
    );
  }

  return request("/categories", {
    method: "POST",
    body: JSON.stringify({
      name,
      description:
        data.description?.trim() ||
        undefined,
      status:
        data.status ||
        "Active",
    }),
  });
}

function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    status?: string;
  }
) {
  return request(
    `/categories/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ...(data.name !== undefined && {
          name: data.name.trim(),
        }),

        ...(data.description !== undefined && {
          description:
            data.description.trim(),
        }),

        ...(data.status !== undefined && {
          status: data.status,
        }),
      }),
    }
  );
}

function archiveCategory(
  id: string
) {
  return request(
    `/categories/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
    }
  );
}

function deleteCategory(
  id: string
) {
  return request(
    `/categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   BRANDS
========================================================= */

function getBrands() {
  return request("/brands");
}

function getBrand(id: string) {
  return request(
    `/brands/${encodeURIComponent(id)}`
  );
}

function createBrand(data: any) {
  return request("/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateBrand(
  id: string,
  data: any
) {
  return request(
    `/brands/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function archiveBrand(id: string) {
  return request(
    `/brands/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
    }
  );
}

function deleteBrand(id: string) {
  return request(
    `/brands/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   SUPPLIERS
========================================================= */

function getSuppliers(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/suppliers${query}`);
}

function getSupplier(id: string) {
  return request(
    `/suppliers/${encodeURIComponent(id)}`
  );
}

function createSupplier(data: any) {
  return request("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateSupplier(
  id: string,
  data: any
) {
  return request(
    `/suppliers/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function archiveSupplier(
  id: string
) {
  return request(
    `/suppliers/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
    }
  );
}

function deleteSupplier(
  id: string
) {
  return request(
    `/suppliers/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   CUSTOMERS
========================================================= */

function getCustomers(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/customers${query}`);
}

function getCustomer(id: string) {
  return request(
    `/customers/${encodeURIComponent(id)}`
  );
}

function createCustomer(data: any) {
  return request("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateCustomer(
  id: string,
  data: any
) {
  return request(
    `/customers/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function archiveCustomer(
  id: string
) {
  return request(
    `/customers/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
    }
  );
}

function deleteCustomer(
  id: string
) {
  return request(
    `/customers/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   SALES
========================================================= */

function getSales(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/sales${query}`);
}

function getSale(id: string) {
  return request(
    `/sales/${encodeURIComponent(id)}`
  );
}

function createSale(data: any) {
  return request("/sales", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* =========================================================
   PURCHASES
========================================================= */

function getPurchases(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/purchases${query}`);
}

function getPurchase(id: string) {
  return request(
    `/purchases/${encodeURIComponent(id)}`
  );
}

function createPurchase(data: any) {
  return request("/purchases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* =========================================================
   EXPENSES
========================================================= */

function getExpenses(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/expenses${query}`);
}

function getExpense(id: string) {
  return request(
    `/expenses/${encodeURIComponent(id)}`
  );
}

function createExpense(data: any) {
  return request("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateExpense(
  id: string,
  data: any
) {
  return request(
    `/expenses/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function deleteExpense(
  id: string
) {
  return request(
    `/expenses/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   RETURNS
========================================================= */

function getReturns(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/returns${query}`);
}

function getReturn(id: string) {
  return request(
    `/returns/${encodeURIComponent(id)}`
  );
}

function createReturn(data: any) {
  return request("/returns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* =========================================================
   STOCK
========================================================= */

function getStock(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/stock${query}`);
}

function getStockMovements() {
  return request("/stock");
}

function getStockItem(id: string) {
  return request(
    `/stock/${encodeURIComponent(id)}`
  );
}

function adjustStock(stockData: any) {
  const productId =
    String(
      stockData?.ProductID ??
      stockData?.productId ??
      stockData?.id ??
      ""
    ).trim();

  if (!productId) {
    return Promise.resolve({
      success: false,
      message:
        "Product ID is required for stock adjustment.",
    });
  }

  const payload = {
    quantity: Number(
      stockData?.quantity ?? 0
    ),

    type: String(
      stockData?.type ?? "IN"
    ),

    adjustmentType: String(
      stockData?.adjustmentType ??
      (stockData?.type === "OUT"
        ? "ADJUSTMENT_OUT"
        : "ADJUSTMENT_IN")
    ),

    reason: String(
      stockData?.reason ?? ""
    ).trim(),

    ...(stockData?.staff
      ? {
        staff: String(
          stockData.staff
        ).trim(),
      }
      : {}),
  };

  return request(
    `/stock/${encodeURIComponent(productId)}/adjust`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================================================
   USERS
========================================================= */

function getUsers(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/users${query}`);
}

function getUser(id: string) {
  return request(
    `/users/${encodeURIComponent(id)}`
  );
}

function createUser(data: any) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function updateUser(
  id: string,
  data: any
) {
  return request(
    `/users/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

function deactivateUser(id: string) {
  return request(
    `/users/${encodeURIComponent(id)}/deactivate`,
    {
      method: "PATCH",
    }
  );
}

/* =========================================================
   USER PERMISSIONS
========================================================= */

function getAllPermissions() {
  return request(
    "/users/permissions/all"
  );
}

function getUserPermissions(
  userId: string
) {
  return request(
    `/users/${encodeURIComponent(userId)}/permissions`
  );
}

function updateUserPermissions(
  userId: string,
  permissionCodes: string[]
) {
  return request(
    `/users/${encodeURIComponent(userId)}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({
        permissionCodes,
      }),
    }
  );
}

function grantUserPermission(
  userId: string,
  permissionCode: string
) {
  return request(
    `/users/${encodeURIComponent(userId)}/permissions/grant`,
    {
      method: "POST",
      body: JSON.stringify({
        permissionCode,
      }),
    }
  );
}

function revokeUserPermission(
  userId: string,
  permissionCode: string
) {
  return request(
    `/users/${encodeURIComponent(userId)}/permissions/revoke`,
    {
      method: "POST",
      body: JSON.stringify({
        permissionCode,
      }),
    }
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function getSettings() {
  return request("/settings");
}

function updateSettings(data: any) {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* =========================================================
   AUDIT LOGS
========================================================= */

function getAuditLogs(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  return request(`/audit-logs${query}`);
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function saveRecord(
  resource: string,
  data: any,
  id?: string
) {
  const normalizedResource =
    resource.startsWith("/")
      ? resource
      : `/${resource}`;

  if (id) {
    return request(
      `${normalizedResource}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  return request(
    normalizedResource,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

function deleteRecord(
  resource: string,
  id: string
) {
  const normalizedResource =
    resource.startsWith("/")
      ? resource
      : `/${resource}`;

  return request(
    `${normalizedResource}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   INVENTORY API
========================================================= */

const inventoryApi = {
  request,

  getAuthToken,
  setAuthToken,
  clearAuthToken,

  login,
  logout,

  getDashboard,

  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProduct,

  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  deleteCategory,

  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  archiveBrand,
  deleteBrand,

  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  archiveSupplier,
  deleteSupplier,

  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  deleteCustomer,

  getSales,
  getSale,
  createSale,

  getPurchases,
  getPurchase,
  createPurchase,

  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,

  getReturns,
  getReturn,
  createReturn,

  getStock,
  getStockMovements,
  getStockItem,
  adjustStock,

  getUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,

  getAllPermissions,
  getUserPermissions,
  updateUserPermissions,
  grantUserPermission,
  revokeUserPermission,

  getSettings,
  updateSettings,

  getAuditLogs,

  saveRecord,
  deleteRecord,
};

export { inventoryApi };

export default inventoryApi;