"use client";

import { Task } from "@/services/taskService";

interface DeleteDialogProps {
    isOpen: boolean;
    task: Task | null;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteDialog({ isOpen, task, loading, onClose, onConfirm }: DeleteDialogProps) {
    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
                <div className="text-4xl mb-3">🗑️</div>
                <h3 className="text-lg font-bold text-gray-900">Delete Task</h3>
                <p className="text-sm text-gray-500 mt-2">
                    Are you sure you want to delete <span className="font-medium text-gray-700">&quot;{task.title}&quot;</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
