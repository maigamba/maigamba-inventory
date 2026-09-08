import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatDate } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';

import {
  Tags,
  Plus,
  Search,
  Edit,
  Archive,
  RotateCw,
  X,
} from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const {
    categories,
    refreshCategories,
    addToast,
    loading,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);
  const [archivingCategory, setArchivingCategory] =
    useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    CategoryName: '',
    Description: '',
    Status: 'Active',
  });

  /* =========================================================
     ADD CATEGORY
  ========================================================= */

  const openAdd = () => {
    setEditingCategory(null);

    setFormData({
      CategoryName: '',
      Description: '',
      Status: 'Active',
    });

    setIsModalOpen(true);
  };

  /* =========================================================
     EDIT CATEGORY
  ========================================================= */

  const openEdit = (category: Category) => {
    setEditingCategory(category);

    const c = category as any;

    setFormData({
      CategoryName: c.CategoryName ?? c.name ?? '',
      Description: c.Description ?? c.description ?? '',
      Status: c.Status ?? c.status ?? 'Active',
    });

    setIsModalOpen(true);
  };

  /* =========================================================
     SAVE CATEGORY
  ========================================================= */

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const categoryName =
      formData.CategoryName.trim();

    const description =
      formData.Description.trim();

    if (!categoryName) {
      addToast(
        'warning',
        'Category name is required.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      /* -----------------------------------------------------
         CREATE
      ----------------------------------------------------- */

      if (!editingCategory) {
        response =
          await inventoryApi.createCategory({
            name: categoryName,
            description: description || undefined,
            status: formData.Status || 'Active',
          });
      }

      /* -----------------------------------------------------
         UPDATE
      ----------------------------------------------------- */

      else {
        const editCategory = editingCategory as any;
        const categoryId =
          editCategory.CategoryID ??
          editCategory.categoryId ??
          editCategory.id;

        if (!categoryId) {
          throw new Error('Category ID is missing. Please refresh the page and try again.');
        }

        response =
          await inventoryApi.updateCategory(
            categoryId,
            {
              name: categoryName,
              description,
              status: formData.Status || 'Active',
            }
          );
      }

      if (response.success) {
        addToast(
          'success',
          editingCategory
            ? `Category "${categoryName}" updated successfully.`
            : `Category "${categoryName}" created successfully.`
        );

        setIsModalOpen(false);
        setEditingCategory(null);

        setFormData({
          CategoryName: '',
          Description: '',
          Status: 'Active',
        });

        await refreshCategories();
      } else {
        addToast(
          'error',
          response.message ||
          'Failed to save category.'
        );
      }
    } catch (error) {
      console.error(
        'Category save error:',
        error
      );

      addToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to save category.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     ARCHIVE CATEGORY
  ========================================================= */

  const handleArchiveConfirm = async () => {
    if (!archivingCategory) {
      return;
    }

    setIsSubmitting(true);

    try {
      const archiveCategory = archivingCategory as any;
      const categoryId =
        archiveCategory.CategoryID ??
        archiveCategory.categoryId ??
        archiveCategory.id;

      if (!categoryId) {
        throw new Error('Category ID is missing. Please refresh the page and try again.');
      }

      const response =
        await inventoryApi.archiveCategory(categoryId);

      if (response.success) {
        const categoryName =
          archiveCategory.CategoryName ??
          archiveCategory.name ??
          'Category';

        addToast(
          'success',
          `Category "${categoryName}" archived successfully.`
        );

        setArchivingCategory(null);

        await refreshCategories();
      } else {
        addToast(
          'error',
          response.message ||
          'Failed to archive category.'
        );
      }
    } catch (error) {
      console.error(
        'Category archive error:',
        error
      );

      addToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to archive category.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredCategories =
    categories.filter((category) => {
      const c = category as any;

      const name = String(
        c.CategoryName ??
        c.name ??
        ''
      );

      const description = String(
        c.Description ??
        c.description ??
        ''
      );

      const searchValue =
        search.trim().toLowerCase();

      return (
        name.toLowerCase().includes(searchValue) ||
        description.toLowerCase().includes(searchValue)
      );
    });

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Product Categories
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Organize hardware inventory into classifications
            (Laptops, Desktops, Storage, Peripherals).
          </p>
        </div>

        <div className="flex items-center gap-2.5">

          <button
            onClick={() => refreshCategories()}
            disabled={loading.categories}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
            title="Refresh"
          >
            <RotateCw
              className={`w-4 h-4 ${loading.categories
                ? 'animate-spin text-blue-600'
                : ''
                }`}
            />
          </button>

          <button
            id="btn-add-category"
            onClick={openAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>

        </div>
      </div>

      {/* SEARCH */}

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">

        <div className="relative max-w-md">

          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
          />

        </div>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">

              <tr>
                <th className="py-3 px-4">
                  ID
                </th>

                <th className="py-3 px-4">
                  Category Name
                </th>

                <th className="py-3 px-4">
                  Description
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

                <th className="py-3 px-4">
                  Created Date
                </th>

                <th className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">

              {filteredCategories.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400"
                  >
                    <Tags className="w-8 h-8 text-slate-300 mx-auto mb-2" />

                    <p className="font-semibold text-slate-600">
                      No categories found
                    </p>
                  </td>

                </tr>

              ) : (

                filteredCategories.map(
                  (category) => {
                    const c = category as any;

                    const categoryId =
                      c.CategoryID ??
                      c.categoryId ??
                      c.id ??
                      '';

                    const categoryName =
                      c.CategoryName ??
                      c.name ??
                      '—';

                    const description =
                      c.Description ??
                      c.description ??
                      '';

                    const status =
                      c.Status ??
                      c.status ??
                      'Active';

                    const createdAt =
                      c.CreatedAt ??
                      c.createdAt ??
                      null;

                    return (
                      <tr
                        key={categoryId}
                        className="hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {categoryId || '—'}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {categoryName}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {description || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500">
                          {createdAt ? formatDate(createdAt) : '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(category)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {status !== 'Archived' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setArchivingCategory(category)
                                }
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                                title="Archive"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
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

      {/* ADD / EDIT MODAL */}

      {isModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

            <div className="p-5 border-b border-slate-100 flex items-center justify-between">

              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory
                  ? 'Edit Category'
                  : 'Add Category'}
              </h3>

              <button
                onClick={() =>
                  setIsModalOpen(false)
                }
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <form
              onSubmit={handleSave}
              className="p-5 space-y-4 text-xs"
            >

              {/* NAME */}

              <div>

                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Category Name *
                </label>

                <input
                  type="text"
                  required
                  value={formData.CategoryName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      CategoryName:
                        e.target.value,
                    })
                  }
                  placeholder="e.g. Laptop Computers"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>

                <textarea
                  rows={2}
                  value={formData.Description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Description:
                        e.target.value,
                    })
                  }
                  placeholder="Brief description of this category..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* STATUS */}

              <div>

                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Status
                </label>

                <select
                  value={formData.Status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Status: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Archived">
                    Archived
                  </option>

                </select>

              </div>

              {/* BUTTONS */}

              <div className="pt-2 flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setIsModalOpen(false)
                  }
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-600/20"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingCategory
                      ? 'Update Category'
                      : 'Save Category'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ARCHIVE CONFIRMATION */}

      <ConfirmationModal
        isOpen={!!archivingCategory}
        title="Archive Category"
        message={`Are you sure you want to archive "${(archivingCategory as any)?.CategoryName ??
          (archivingCategory as any)?.name ??
          'this category'
          }"?`}
        confirmText="Archive"
        isLoading={isSubmitting}
        onConfirm={handleArchiveConfirm}
        onCancel={() =>
          setArchivingCategory(null)
        }
      />

    </div>
  );
};