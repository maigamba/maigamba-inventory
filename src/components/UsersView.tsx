import React, {
  useMemo,
  useState,
} from 'react';

import { useInventory } from '../context/InventoryContext';
import { User } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatDate } from '../utils/formatters';

import {
  ShieldCheck,
  Plus,
  Search,
  Edit,
  RotateCw,
  X,
  Shield,
  CheckSquare,
  Square,
  Save,
  LockKeyhole,
  UserCog,
  AlertCircle,
  Users,
  KeyRound,
} from 'lucide-react';


// ============================================================================
// USER ROLES
// ============================================================================

const USER_ROLES = [
  'Admin',
  'Manager',
  'Sales Staff',
  'Inventory Officer',
] as const;

type UserRole =
  (typeof USER_ROLES)[number];


// ============================================================================
// PERMISSION TYPES
// ============================================================================

interface PermissionRecord {
  permissionId?: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

interface PermissionGroup {
  module: string;
  permissions: PermissionRecord[];
}


// ============================================================================
// USER NORMALIZER
// ============================================================================

const normalizeUser = (
  raw: any
): User => ({
  ...raw,

  UserID: String(
    raw?.UserID ??
    raw?.userId ??
    raw?.id ??
    ''
  ).trim(),

  FullName: String(
    raw?.FullName ??
    raw?.fullName ??
    ''
  ).trim(),

  Username: String(
    raw?.Username ??
    raw?.username ??
    raw?.email ??
    ''
  ).trim(),

  Email: String(
    raw?.Email ??
    raw?.email ??
    ''
  ).trim(),

  Phone:
    raw?.Phone ??
    raw?.phone ??
    undefined,

  Role: String(
    raw?.Role ??
    raw?.role ??
    'Sales Staff'
  ).trim(),

  Status: String(
    raw?.Status ??
    raw?.status ??
    'Active'
  ).trim(),

  CreatedAt:
    raw?.CreatedAt ??
    raw?.createdAt,

  UpdatedAt:
    raw?.UpdatedAt ??
    raw?.updatedAt,
});


// ============================================================================
// PERMISSION NORMALIZER
// ============================================================================

const normalizePermission = (
  raw: any
): PermissionRecord => {
  const permission =
    raw?.permission ??
    raw;

  return {
    permissionId:
      permission?.permissionId ??
      permission?.PermissionID ??
      permission?.id,

    code: String(
      permission?.code ??
      permission?.Code ??
      ''
    ).trim(),

    name: String(
      permission?.name ??
      permission?.Name ??
      permission?.code ??
      ''
    ).trim(),

    description:
      permission?.description ??
      permission?.Description ??
      '',

    module: String(
      permission?.module ??
      permission?.Module ??
      'Other'
    ).trim() || 'Other',
  };
};


// ============================================================================
// USERS VIEW
// ============================================================================

export const UsersView: React.FC = () => {
  const {
    users,
    currentUser,
    refreshUsers,
    addToast,
    loading,
  } = useInventory();


  // ==========================================================================
  // SEARCH
  // ==========================================================================

  const [search, setSearch] =
    useState('');


  // ==========================================================================
  // USER MODAL
  // ==========================================================================

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState<User | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);


  // ==========================================================================
  // USER FORM
  // ==========================================================================

  const [formData, setFormData] =
    useState({
      FullName: '',
      Username: '',
      Email: '',
      Phone: '',
      Role:
        'Sales Staff' as UserRole,
      Status: 'Active',
      Password: '',
    });


  // ==========================================================================
  // PERMISSION MODAL
  // ==========================================================================

  const [
    isPermissionModalOpen,
    setIsPermissionModalOpen,
  ] = useState(false);

  const [
    selectedUserForPermissions,
    setSelectedUserForPermissions,
  ] = useState<User | null>(null);

  const [
    allPermissions,
    setAllPermissions,
  ] = useState<PermissionRecord[]>([]);

  const [
    selectedPermissionCodes,
    setSelectedPermissionCodes,
  ] = useState<string[]>([]);

  const [
    permissionLoading,
    setPermissionLoading,
  ] = useState(false);

  const [
    permissionSaving,
    setPermissionSaving,
  ] = useState(false);


  // ==========================================================================
  // OPEN ADD
  // ==========================================================================

  const openAdd = () => {
    setEditingUser(null);

    setFormData({
      FullName: '',
      Username: '',
      Email: '',
      Phone: '',
      Role: 'Sales Staff',
      Status: 'Active',
      Password: '',
    });

    setIsModalOpen(true);
  };


  // ==========================================================================
  // OPEN EDIT
  // ==========================================================================

  const openEdit = (
    user: User
  ) => {
    setEditingUser(user);

    setFormData({
      FullName:
        user.FullName || '',

      Username:
        user.Username || '',

      Email:
        user.Email || '',

      Phone:
        user.Phone || '',

      Role:
        USER_ROLES.includes(
          user.Role as UserRole
        )
          ? (
            user.Role as UserRole
          )
          : 'Sales Staff',

      Status:
        user.Status || 'Active',

      Password: '',
    });

    setIsModalOpen(true);
  };


  // ==========================================================================
  // SAVE USER
  // ==========================================================================

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const fullName =
      formData.FullName.trim();

    const email =
      formData.Email.trim();

    const phone =
      formData.Phone.trim();

    const password =
      formData.Password.trim();

    if (!fullName) {
      addToast(
        'warning',
        'Full Name is required.',
        'Validation'
      );

      return;
    }

    if (!email) {
      addToast(
        'warning',
        'Email address is required.',
        'Validation'
      );

      return;
    }

    if (
      !editingUser &&
      !password
    ) {
      addToast(
        'warning',
        'Password is required when creating a new user.',
        'Validation'
      );

      return;
    }

    if (
      password &&
      password.length < 8
    ) {
      addToast(
        'warning',
        'Password must be at least 8 characters.',
        'Validation'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      if (editingUser) {
        response =
          await inventoryApi.updateUser(
            editingUser.UserID,
            {
              fullName,
              email,
              phone:
                phone || null,
              role:
                formData.Role,
              status:
                formData.Status,
              ...(password
                ? {
                  password,
                }
                : {}),
            }
          );
      } else {
        response =
          await inventoryApi.createUser(
            {
              fullName,
              email,
              phone:
                phone || undefined,
              role:
                formData.Role,
              status:
                formData.Status,
              password,
            }
          );
      }

      if (response?.success) {
        addToast(
          'success',
          editingUser
            ? `User "${fullName}" updated successfully.`
            : `User "${fullName}" created successfully.`,
          'User Management'
        );

        setIsModalOpen(false);

        await refreshUsers();
      } else {
        addToast(
          'error',
          response?.message ||
          'Failed to save user account.',
          'User Management'
        );
      }
    } catch (error: any) {
      console.error(
        'Failed to save user:',
        error
      );

      addToast(
        'error',
        error?.message ||
        'Failed to save user account.',
        'User Management'
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  // ==========================================================================
  // OPEN PERMISSION MANAGER
  // ==========================================================================

  const openPermissions = async (
    user: User
  ) => {
    setSelectedUserForPermissions(
      user
    );

    setIsPermissionModalOpen(true);

    setPermissionLoading(true);

    setAllPermissions([]);

    setSelectedPermissionCodes([]);

    try {
      // ----------------------------------------------------------------------
      // Load ALL available permissions
      // ----------------------------------------------------------------------

      const allResponse =
        await inventoryApi.getAllPermissions();

      let rawAllPermissions: any[] = [];

      if (
        Array.isArray(
          allResponse?.data
        )
      ) {
        rawAllPermissions =
          allResponse.data;
      } else if (
        Array.isArray(
          allResponse?.data?.permissions
        )
      ) {
        rawAllPermissions =
          allResponse.data.permissions;
      }

      const normalizedAll =
        rawAllPermissions
          .map(
            normalizePermission
          )
          .filter(
            (
              permission
            ) =>
              Boolean(
                permission.code
              )
          );

      setAllPermissions(
        normalizedAll
      );


      // ----------------------------------------------------------------------
      // Load USER'S DIRECT SAVED PERMISSIONS
      // ----------------------------------------------------------------------

      const userResponse =
        await inventoryApi.getUserPermissions(
          user.UserID
        );

      let rawUserPermissions: any[] =
        [];

      if (
        Array.isArray(
          userResponse?.data?.permissions
        )
      ) {
        rawUserPermissions =
          userResponse.data
            .permissions;
      } else if (
        Array.isArray(
          userResponse?.data
            ?.data?.permissions
        )
      ) {
        rawUserPermissions =
          userResponse.data
            .data.permissions;
      } else if (
        Array.isArray(
          userResponse?.data
        )
      ) {
        rawUserPermissions =
          userResponse.data;
      }

      const selectedCodes =
        rawUserPermissions
          .map((permission: any) =>
            String(
              permission?.permission
                ?.code ??
              permission?.code ??
              permission?.permissionCode ??
              ''
            ).trim()
          )
          .filter(Boolean);

      setSelectedPermissionCodes(
        Array.from(
          new Set(
            selectedCodes
          )
        )
      );
    } catch (error: any) {
      console.error(
        'Failed to load user permissions:',
        error
      );

      addToast(
        'error',
        error?.message ||
        'Failed to load permissions.',
        'Permissions'
      );

      setIsPermissionModalOpen(
        false
      );
    } finally {
      setPermissionLoading(false);
    }
  };


  // ==========================================================================
  // GROUP PERMISSIONS BY MODULE
  // ==========================================================================

  const permissionGroups =
    useMemo<
      PermissionGroup[]
    >(() => {
      const groups =
        new Map<
          string,
          PermissionRecord[]
        >();

      allPermissions.forEach(
        (permission) => {
          const module =
            permission.module ||
            'Other';

          if (
            !groups.has(module)
          ) {
            groups.set(
              module,
              []
            );
          }

          groups
            .get(module)!
            .push(permission);
        }
      );

      return Array.from(
        groups.entries()
      ).map(
        ([
          module,
          permissions,
        ]) => ({
          module,
          permissions,
        })
      );
    }, [
      allPermissions,
    ]);


  // ==========================================================================
  // TOGGLE PERMISSION
  // ==========================================================================

  const togglePermission = (
    permissionCode: string
  ) => {
    setSelectedPermissionCodes(
      (previous) => {
        if (
          previous.includes(
            permissionCode
          )
        ) {
          return previous.filter(
            (code) =>
              code !==
              permissionCode
          );
        }

        return [
          ...previous,
          permissionCode,
        ];
      }
    );
  };


  // ==========================================================================
  // SELECT ALL
  // ==========================================================================

  const selectAllPermissions =
    () => {
      setSelectedPermissionCodes(
        allPermissions.map(
          (
            permission
          ) =>
            permission.code
        )
      );
    };


  // ==========================================================================
  // CLEAR ALL
  // ==========================================================================

  const clearAllPermissions =
    () => {
      setSelectedPermissionCodes(
        []
      );
    };


  // ==========================================================================
  // MODULE SELECT COUNT
  // ==========================================================================

  const getSelectedCount =
    (
      permissions: PermissionRecord[]
    ) =>
      permissions.filter(
        (
          permission
        ) =>
          selectedPermissionCodes.includes(
            permission.code
          )
      ).length;


  // ==========================================================================
  // SAVE PERMISSIONS
  // ==========================================================================

  const handleSavePermissions =
    async () => {
      if (
        !selectedUserForPermissions
      ) {
        return;
      }

      setPermissionSaving(true);

      try {
        const response =
          await inventoryApi.updateUserPermissions(
            selectedUserForPermissions.UserID,
            selectedPermissionCodes
          );

        if (
          response?.success
        ) {
          addToast(
            'success',
            `${selectedPermissionCodes.length} permission(s) saved for ${selectedUserForPermissions.FullName}.`,
            'Permissions Updated'
          );

          setIsPermissionModalOpen(
            false
          );

          setSelectedUserForPermissions(
            null
          );

          setSelectedPermissionCodes(
            []
          );
        } else {
          addToast(
            'error',
            response?.message ||
            'Failed to save permissions.',
            'Permissions'
          );
        }
      } catch (error: any) {
        console.error(
          'Failed to save permissions:',
          error
        );

        addToast(
          'error',
          error?.message ||
          'Failed to save permissions.',
          'Permissions'
        );
      } finally {
        setPermissionSaving(
          false
        );
      }
    };


  // ==========================================================================
  // FILTER USERS
  // ==========================================================================

  const filteredUsers =
    users.filter(
      (rawUser) => {
        const user =
          normalizeUser(
            rawUser
          );

        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          user.FullName
            .toLowerCase()
            .includes(query) ||
          user.Username
            .toLowerCase()
            .includes(query) ||
          user.Email
            .toLowerCase()
            .includes(query) ||
          user.Role
            .toLowerCase()
            .includes(query)
        );
      }
    );


  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ====================================================================
          PAGE HEADER
      ==================================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Staff & Access Control
            </h2>

            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[9px] uppercase tracking-widest text-slate-500">
              Security
            </span>

          </div>

          <p className="text-xs text-slate-500 mt-1">
            Manage staff accounts, roles, credentials,
            and individual system permissions.
          </p>

        </div>


        <div className="flex items-center gap-2.5">

          <button
            type="button"
            onClick={() =>
              refreshUsers()
            }
            disabled={
              loading.users
            }
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
            title="Refresh Users"
          >
            <RotateCw
              className={`w-4 h-4 ${loading.users
                  ? 'animate-spin text-blue-600'
                  : ''
                }`}
            />
          </button>


          <button
            id="btn-add-user"
            type="button"
            onClick={
              openAdd
            }
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />

            <span>
              Add Staff User
            </span>
          </button>

        </div>

      </div>


      {/* ====================================================================
          SEARCH
      ==================================================================== */}

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">

        <div className="relative max-w-md">

          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search staff by name, username, email, or role..."
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

      </div>


      {/* ====================================================================
          USERS TABLE
      ==================================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">

              <tr>

                <th className="py-3 px-4">
                  Staff Member
                </th>

                <th className="py-3 px-4">
                  Username
                </th>

                <th className="py-3 px-4">
                  Role
                </th>

                <th className="py-3 px-4">
                  Email
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

                <th className="py-3 px-4">
                  Date Added
                </th>

                <th className="py-3 px-4 text-right">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100 text-slate-700">

              {filteredUsers.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="py-14 text-center text-slate-400"
                  >

                    <ShieldCheck className="w-9 h-9 text-slate-300 mx-auto mb-3" />

                    <p className="font-semibold text-slate-600">
                      No user accounts found
                    </p>

                    <p className="text-xs mt-1 text-slate-400">
                      Try another search or create a new staff account.
                    </p>

                  </td>

                </tr>

              ) : (

                filteredUsers.map(
                  (rawUser) => {
                    const user =
                      normalizeUser(
                        rawUser
                      );

                    const isCurrentUser =
                      String(
                        currentUser?.UserID
                      ) ===
                      String(
                        user.UserID
                      );

                    return (
                      <tr
                        key={
                          user.UserID
                        }
                        className="hover:bg-slate-50 transition-colors"
                      >

                        <td className="py-3 px-4">

                          <div className="flex items-center gap-3">

                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0">
                              {user.FullName
                                .slice(
                                  0,
                                  2
                                )
                                .toUpperCase() ||
                                'MG'}
                            </div>

                            <div className="min-w-0">

                              <div className="font-bold text-slate-900 truncate">

                                {user.FullName ||
                                  'Unnamed User'}

                                {isCurrentUser && (
                                  <span className="ml-2 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    You
                                  </span>
                                )}

                              </div>

                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {user.UserID}
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="py-3 px-4 font-mono text-slate-600">
                          @{user.Username ||
                            '—'}
                        </td>


                        <td className="py-3 px-4">

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${user.Role ===
                                'Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : user.Role ===
                                  'Manager'
                                  ? 'bg-blue-100 text-blue-800'
                                  : user.Role ===
                                    'Inventory Officer'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {user.Role}
                          </span>

                        </td>


                        <td className="py-3 px-4 text-slate-500">
                          {user.Email ||
                            '—'}
                        </td>


                        <td className="py-3 px-4">

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${user.Status
                                .toLowerCase() ===
                                'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}
                          >
                            {user.Status ||
                              'Active'}
                          </span>

                        </td>


                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(
                            user.CreatedAt
                          )}
                        </td>


                        <td className="py-3 px-4">

                          <div className="flex items-center justify-end gap-1.5">

                            {/* PERMISSION BUTTON */}

                            <button
                              type="button"
                              onClick={() =>
                                openPermissions(
                                  user
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] font-semibold transition-colors"
                              title="Manage Access Permissions"
                            >
                              <KeyRound className="w-3.5 h-3.5" />

                              <span className="hidden xl:inline">
                                Permissions
                              </span>
                            </button>


                            {/* EDIT BUTTON */}

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  user
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ====================================================================
          ADD / EDIT USER MODAL
      ==================================================================== */}

      {isModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">

          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">

            {/* HEADER */}

            <div className="p-5 border-b border-slate-100 flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <UserCog className="w-4 h-4 text-blue-600" />

                  <h3 className="text-sm font-bold text-slate-900">
                    {editingUser
                      ? 'Edit Staff Account'
                      : 'Create New Staff User'}
                  </h3>

                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Account credentials and system role
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(
                    false
                  )
                }
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={
                handleSave
              }
              className="p-5 space-y-4"
            >

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.FullName
                  }
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      FullName:
                        event.target
                          .value,
                    })
                  }
                  placeholder="e.g. Ibrahim Maigamba"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Username
                  </label>

                  <input
                    type="text"
                    value={
                      formData.Username
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        Username:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Username"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>


                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    System Role
                  </label>

                  <select
                    value={
                      formData.Role
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        Role:
                          event.target
                            .value as UserRole,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {USER_ROLES.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {role}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email *
                  </label>

                  <input
                    type="email"
                    required
                    value={
                      formData.Email
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        Email:
                          event.target
                            .value,
                      })
                    }
                    placeholder="staff@maigamba.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>


                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      formData.Phone
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        Phone:
                          event.target
                            .value,
                      })
                    }
                    placeholder="080..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>


              <div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {editingUser
                    ? 'New Password'
                    : 'Account Password *'}
                </label>

                <div className="relative">

                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="password"
                    required={
                      !editingUser
                    }
                    value={
                      formData.Password
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        Password:
                          event.target
                            .value,
                      })
                    }
                    placeholder={
                      editingUser
                        ? 'Leave blank to keep current password'
                        : 'Minimum 8 characters'
                    }
                    className="w-full pl-10 pr-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>


              <div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Account Status
                </label>

                <select
                  value={
                    formData.Status
                  }
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      Status:
                        event.target
                          .value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Suspended / Inactive
                  </option>
                </select>

              </div>


              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">

                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />

                <div>

                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Role & Permissions
                  </p>

                  <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                    The system role provides the default access level.
                    Individual permissions can be customized separately.
                  </p>

                </div>

              </div>


              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setIsModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingUser
                      ? 'Save Changes'
                      : 'Create User'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ====================================================================
          ACCESS PERMISSIONS MODAL
      ==================================================================== */}

      {isPermissionModalOpen &&
        selectedUserForPermissions && (

          <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center">

            {/* ================================================================
              MODAL
          ================================================================ */}

            <div className="w-full max-w-6xl h-[94vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0">

              {/* ============================================================
                HEADER - FIXED
            ============================================================ */}

              <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 bg-white">

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">

                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>


                    <div>

                      <div className="flex items-center gap-2 flex-wrap">

                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          Access Permissions
                        </h3>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[9px] uppercase tracking-widest text-slate-500">
                          User Access
                        </span>

                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {selectedUserForPermissions.FullName}
                        {' • '}
                        {selectedUserForPermissions.Role}
                      </p>

                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        {selectedUserForPermissions.UserID}
                      </p>

                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={() => {
                      setIsPermissionModalOpen(
                        false
                      );

                      setSelectedUserForPermissions(
                        null
                      );

                      setSelectedPermissionCodes(
                        []
                      );
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

                </div>

              </div>


              {/* ============================================================
                INFO / SELECT CONTROLS - FIXED
            ============================================================ */}

              <div className="shrink-0 px-5 sm:px-6 py-3 border-b border-slate-200 bg-slate-50">

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

                  <div className="flex items-start gap-2.5">

                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />

                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                      Checked permissions are explicitly allowed for this user.
                      Unchecked permissions are explicitly denied when the permissions
                      are saved.
                    </p>

                  </div>


                  <div className="flex items-center gap-2 shrink-0">

                    <button
                      type="button"
                      onClick={
                        selectAllPermissions
                      }
                      disabled={
                        permissionLoading ||
                        allPermissions.length === 0
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Select All
                    </button>


                    <button
                      type="button"
                      onClick={
                        clearAllPermissions
                      }
                      disabled={
                        permissionLoading ||
                        allPermissions.length === 0
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Clear All
                    </button>

                  </div>

                </div>

              </div>


              {/* ============================================================
                SCROLLABLE PERMISSION AREA
            ============================================================ */}

              <div className="flex-1 min-h-0 overflow-hidden">

                <div
                  className="
                  h-full
                  overflow-y-auto
                  overflow-x-hidden
                  px-4
                  sm:px-5
                  lg:px-6
                  py-5
                  overscroll-contain
                  [scrollbar-width:thin]
                "
                >

                  {permissionLoading ? (

                    <div className="h-full flex items-center justify-center">

                      <div className="text-center">

                        <div className="w-9 h-9 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto" />

                        <p className="text-xs font-semibold text-slate-600 mt-4">
                          Loading permissions...
                        </p>

                        <p className="text-[10px] text-slate-400 mt-1">
                          Reading saved access settings
                        </p>

                      </div>

                    </div>

                  ) : permissionGroups.length === 0 ? (

                    <div className="h-full flex items-center justify-center">

                      <div className="text-center">

                        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                        <p className="text-sm font-semibold text-slate-700">
                          No permissions available
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          The permission list could not be loaded.
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="space-y-5">

                      {permissionGroups.map(
                        (group) => {

                          const selectedCount =
                            getSelectedCount(
                              group.permissions
                            );

                          const allSelected =
                            group.permissions.length >
                            0 &&
                            selectedCount ===
                            group.permissions.length;

                          return (

                            <section
                              key={
                                group.module
                              }
                              className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                            >

                              {/* MODULE HEADER */}

                              <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200">

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

                                  <div>

                                    <div className="flex items-center gap-2">

                                      <h4 className="text-sm font-bold text-slate-900">
                                        {group.module}
                                      </h4>

                                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 uppercase tracking-wider">
                                        {group.permissions.length}
                                      </span>

                                    </div>

                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {selectedCount}
                                      {' '}
                                      of
                                      {' '}
                                      {group.permissions.length}
                                      {' '}
                                      selected
                                    </p>

                                  </div>


                                  <button
                                    type="button"
                                    onClick={() => {

                                      if (
                                        allSelected
                                      ) {

                                        setSelectedPermissionCodes(
                                          (
                                            previous
                                          ) =>
                                            previous.filter(
                                              (
                                                code
                                              ) =>
                                                !group.permissions.some(
                                                  (
                                                    permission
                                                  ) =>
                                                    permission.code ===
                                                    code
                                                )
                                            )
                                        );

                                      } else {

                                        setSelectedPermissionCodes(
                                          (
                                            previous
                                          ) =>
                                            Array.from(
                                              new Set(
                                                [
                                                  ...previous,
                                                  ...group.permissions.map(
                                                    (
                                                      permission
                                                    ) =>
                                                      permission.code
                                                  ),
                                                ]
                                              )
                                            )
                                        );

                                      }

                                    }}
                                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                  >
                                    {allSelected
                                      ? 'Clear Module'
                                      : 'Select Module'}
                                  </button>

                                </div>

                              </div>


                              {/* PERMISSION LIST */}

                              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">

                                {group.permissions.map(
                                  (
                                    permission
                                  ) => {

                                    const checked =
                                      selectedPermissionCodes.includes(
                                        permission.code
                                      );

                                    return (

                                      <label
                                        key={
                                          permission.code
                                        }
                                        className={`
                                        flex
                                        items-start
                                        gap-3
                                        p-4
                                        rounded-xl
                                        border
                                        cursor-pointer
                                        transition-all
                                        ${checked
                                            ? 'border-purple-300 bg-purple-50/60'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                          }
                                      `}
                                      >

                                        <input
                                          type="checkbox"
                                          checked={
                                            checked
                                          }
                                          onChange={() =>
                                            togglePermission(
                                              permission.code
                                            )
                                          }
                                          className="sr-only"
                                        />


                                        <div
                                          className={`
                                          mt-0.5
                                          w-5
                                          h-5
                                          rounded-md
                                          border
                                          flex
                                          items-center
                                          justify-center
                                          shrink-0
                                          transition-colors
                                          ${checked
                                              ? 'bg-purple-600 border-purple-600 text-white'
                                              : 'bg-white border-slate-300'
                                            }
                                        `}
                                        >

                                          {checked && (
                                            <svg
                                              viewBox="0 0 20 20"
                                              fill="none"
                                              className="w-3.5 h-3.5"
                                            >
                                              <path
                                                d="M5 10.5L8.5 14L15 7"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          )}

                                        </div>


                                        <div className="min-w-0 flex-1">

                                          <div className="flex items-start justify-between gap-3">

                                            <p className="text-sm font-semibold text-slate-900 leading-snug">
                                              {permission.name}
                                            </p>

                                            {checked && (
                                              <span className="shrink-0 text-[8px] uppercase tracking-wider font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md">
                                                Allowed
                                              </span>
                                            )}

                                          </div>


                                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                                            {permission.description ||
                                              'Access permission for this module.'}
                                          </p>


                                          <p className="text-[9px] font-mono text-slate-400 mt-2 break-all">
                                            {permission.code}
                                          </p>

                                        </div>

                                      </label>

                                    );
                                  }
                                )}

                              </div>

                            </section>

                          );
                        }
                      )}

                    </div>

                  )}

                </div>

              </div>


              {/* ============================================================
                FOOTER - FIXED
            ============================================================ */}

              <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-200 bg-white">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">

                      <p className="text-[9px] uppercase tracking-wider text-purple-600 font-bold">
                        Selected
                      </p>

                      <p className="text-sm font-bold text-purple-800 leading-none mt-1">
                        {
                          selectedPermissionCodes.length
                        }
                      </p>

                    </div>


                    <div>

                      <p className="text-xs font-semibold text-slate-700">
                        {selectedPermissionCodes.length ===
                          1
                          ? 'Permission selected'
                          : 'Permissions selected'}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Changes apply the next time the user logs in.
                      </p>

                    </div>

                  </div>


                  <div className="flex items-center justify-end gap-2">

                    <button
                      type="button"
                      onClick={() => {
                        setIsPermissionModalOpen(
                          false
                        );

                        setSelectedUserForPermissions(
                          null
                        );

                        setSelectedPermissionCodes(
                          []
                        );
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>


                    <button
                      type="button"
                      onClick={
                        handleSavePermissions
                      }
                      disabled={
                        permissionLoading ||
                        permissionSaving ||
                        !selectedUserForPermissions
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 disabled:opacity-50 transition-colors"
                    >

                      {permissionSaving ? (

                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>

                      ) : (

                        <>
                          <Save className="w-4 h-4" />
                          Save Permissions
                        </>

                      )}

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

    </div>
  );
};