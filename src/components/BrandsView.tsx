import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Brand } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatDate } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Bookmark,
  Plus,
  Search,
  Edit,
  Archive,
  RotateCw,
  X,
} from 'lucide-react';

export const BrandsView: React.FC = () => {
  const { brands, refreshBrands, addToast, loading } = useInventory();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [archivingBrand, setArchivingBrand] = useState<Brand | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    BrandName: '',
    Description: '',
    Status: 'Active',
  });

  const getBrandData = (brand: Brand) => {
    const b = brand as any;

    return {
      id: b.BrandID ?? b.brandId ?? b.id ?? '',
      name: b.BrandName ?? b.name ?? '',
      description: b.Description ?? b.description ?? '',
      status: b.Status ?? b.status ?? 'Active',
      createdAt: b.CreatedAt ?? b.createdAt ?? null,
      updatedAt: b.UpdatedAt ?? b.updatedAt ?? null,
    };
  };

  const openAdd = () => {
    setEditingBrand(null);
    setFormData({
      BrandName: '',
      Description: '',
      Status: 'Active',
    });
    setIsModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    const b = getBrandData(brand);

    setEditingBrand(brand);
    setFormData({
      BrandName: b.name,
      Description: b.description,
      Status: b.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const brandName = formData.BrandName.trim();
    const description = formData.Description.trim();
    const status = formData.Status || 'Active';

    if (!brandName) {
      addToast('warning', 'Brand name is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      let response: any;

      if (!editingBrand) {
        response = await inventoryApi.createBrand({
          name: brandName,
          description: description || undefined,
          status,
        });
      } else {
        const b = getBrandData(editingBrand);

        if (!b.id) {
          throw new Error(
            'Brand ID is missing. Please refresh the page and try again.'
          );
        }

        response = await inventoryApi.updateBrand(b.id, {
          name: brandName,
          description,
          status,
        });
      }

      if (response?.success) {
        addToast(
          'success',
          editingBrand
            ? `Brand "${brandName}" updated successfully.`
            : `Brand "${brandName}" created successfully.`
        );

        setIsModalOpen(false);
        setEditingBrand(null);
        setFormData({
          BrandName: '',
          Description: '',
          Status: 'Active',
        });

        await refreshBrands();
      } else {
        addToast(
          'error',
          response?.message || 'Failed to save brand.'
        );
      }
    } catch (error) {
      console.error('Brand save error:', error);

      addToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to save brand.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingBrand) return;

    const b = getBrandData(archivingBrand);

    if (!b.id) {
      addToast(
        'error',
        'Brand ID is missing. Please refresh the page and try again.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await inventoryApi.archiveBrand(b.id);

      if (response?.success) {
        addToast(
          'success',
          `Brand "${b.name || 'Brand'}" archived successfully.`
        );

        setArchivingBrand(null);
        await refreshBrands();
      } else {
        addToast(
          'error',
          response?.message || 'Failed to archive brand.'
        );
      }
    } catch (error) {
      console.error('Brand archive error:', error);

      addToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to archive brand.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBrands = brands.filter((brand) => {
    const b = getBrandData(brand);
    const searchValue = search.trim().toLowerCase();

    return (
      b.name.toLowerCase().includes(searchValue) ||
      b.description.toLowerCase().includes(searchValue) ||
      b.id.toLowerCase().includes(searchValue)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Computer & Device Brands
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Manage manufacturer brands (HP, Dell, Apple, Lenovo, Toshiba, Acer, Asus).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshBrands()}
            disabled={loading.brands}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
            title="Refresh"
          >
            <RotateCw
              className={`w-4 h-4 ${loading.brands ? 'animate-spin text-blue-600' : ''
                }`}
            />
          </button>

          <button
            id="btn-add-brand"
            type="button"
            onClick={openAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand</span>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
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
                <th className="py-3 px-4">Brand ID</th>
                <th className="py-3 px-4">Brand Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBrands.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400"
                  >
                    <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      No brands recorded
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => {
                  const b = getBrandData(brand);

                  return (
                    <tr
                      key={b.id || `${b.name}-${b.createdAt || ''}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {b.id || '—'}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {b.name || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {b.description || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${b.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {b.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {b.createdAt ? formatDate(b.createdAt) : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(brand)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {b.status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => setArchivingBrand(brand)}
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
                })
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
                {editingBrand ? 'Edit Brand' : 'Add Brand'}
              </h3>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-5 space-y-4 text-xs"
            >
              {/* BRAND NAME */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Brand Name *
                </label>

                <input
                  type="text"
                  required
                  value={formData.BrandName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      BrandName: e.target.value,
                    })
                  }
                  placeholder="e.g. Hewlett-Packard (HP)"
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
                      Description: e.target.value,
                    })
                  }
                  placeholder="Laptops, PCs, printers and accessories..."
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
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* BUTTONS */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    : editingBrand
                      ? 'Update Brand'
                      : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!archivingBrand}
        title="Archive Brand"
        message={`Are you sure you want to archive "${archivingBrand
          ? getBrandData(archivingBrand).name
          : 'this brand'
          }"?`}
        confirmText="Archive"
        isLoading={isSubmitting}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchivingBrand(null)}
      />
    </div>
  );
};
