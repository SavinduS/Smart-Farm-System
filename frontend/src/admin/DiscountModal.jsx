import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function DiscountModal({ isOpen, onClose, onSave, discountToEdit, isSaving }) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'PERCENTAGE',
        value: 0,
        minPurchase: 0,
        startDate: '',
        endDate: '',
        isActive: true,
    });

    useEffect(() => {
        if (discountToEdit) {
            setFormData({
                name: discountToEdit.name || '',
                code: discountToEdit.code || '',
                type: discountToEdit.type || 'PERCENTAGE',
                value: discountToEdit.value || 0,
                minPurchase: discountToEdit.minPurchase || 0,
                startDate: discountToEdit.startDate ? discountToEdit.startDate.slice(0, 10) : '',
                endDate: discountToEdit.endDate ? discountToEdit.endDate.slice(0, 10) : '',
                isActive: discountToEdit.isActive ?? true,
            });
        } else {
            setFormData({
                name: '',
                code: '',
                type: 'PERCENTAGE',
                value: 0,
                minPurchase: 0,
                startDate: '',
                endDate: '',
                isActive: true,
            });
        }
    }, [discountToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, discountToEdit?._id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{discountToEdit ? 'Edit Discount' : 'Create Discount'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Code</label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            required
                            className="w-full border rounded p-2 font-mono uppercase"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FLAT">Flat</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Value</label>
                            <input
                                type="number"
                                name="value"
                                value={formData.value}
                                onChange={handleChange}
                                required
                                className="w-full border rounded p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Minimum Purchase</label>
                        <input
                            type="number"
                            name="minPurchase"
                            value={formData.minPurchase}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            />
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="isActive"
                            type="checkbox"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
