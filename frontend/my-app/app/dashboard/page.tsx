"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TaskCard from "@/components/TaskCard";
import AdminTaskCard from "@/components/AdminTaskCard";
import TaskModal from "@/components/TaskModal";
import DeleteDialog from "@/components/DeleteDialog";
import PaginationComponent from "@/components/Pagination";
import Toast, { ToastData } from "@/components/Toast";
import { taskService, Task, AdminTask, PaginationMeta } from "@/services/taskService";

type TabType = "my-tasks" | "all-tasks";

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    // Tab state (only relevant for admins)
    const [activeTab, setActiveTab] = useState<TabType>("my-tasks");

    // Task state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingTask, setDeletingTask] = useState<Task | AdminTask | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<ToastData | null>(null);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
    };

    // Debounce search input (400ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === "all-tasks" && isAdmin) {
                const data = await taskService.getAllTasks({
                    page: currentPage,
                    limit: 10,
                    status: statusFilter || undefined,
                });
                setAdminTasks(data.tasks);
                setPagination(data.pagination);
            } else {
                const data = await taskService.getTasks({
                    page: currentPage,
                    limit: 10,
                    status: statusFilter || undefined,
                    search: debouncedSearch || undefined,
                });
                setTasks(data.tasks);
                setPagination(data.pagination);
            }
        } catch {
            showToast("Failed to fetch tasks", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, debouncedSearch, activeTab, isAdmin]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Reset page on tab switch
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setStatusFilter("");
        setSearchInput("");
        setDebouncedSearch("");
    };

    // Status filter change
    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    // Create task
    const handleCreate = async (data: { title: string; description: string; status: string }) => {
        try {
            await taskService.createTask(data);
            showToast("Task created successfully", "success");
            fetchTasks();
        } catch {
            showToast("Failed to create task", "error");
            throw new Error("Create failed");
        }
    };

    // Edit task
    const handleEdit = async (data: { title: string; description: string; status: string }) => {
        if (!editingTask) return;
        try {
            await taskService.updateTask(editingTask.id, data);
            showToast("Task updated successfully", "success");
            fetchTasks();
        } catch {
            showToast("Failed to update task", "error");
            throw new Error("Update failed");
        }
    };

    // Delete task
    const handleDeleteConfirm = async () => {
        if (!deletingTask) return;
        setDeleteLoading(true);
        try {
            if (activeTab === "all-tasks" && isAdmin) {
                await taskService.deleteAnyTask(deletingTask.id);
            } else {
                await taskService.deleteTask(deletingTask.id);
            }
            showToast("Task deleted successfully", "success");
            setDeletingTask(null);
            fetchTasks();
        } catch {
            showToast("Failed to delete task", "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Open modals
    const openCreateModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 min-h-screen hidden md:flex flex-col">
                    <div className="p-6">
                        <h1 className="text-xl font-bold text-gray-900">📋 Task Manager</h1>
                    </div>
                    <nav className="px-4 space-y-1">
                        <button
                            onClick={() => handleTabChange("my-tasks")}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === "my-tasks"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            My Tasks
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => handleTabChange("all-tasks")}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === "all-tasks"
                                        ? "bg-purple-50 text-purple-700"
                                        : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                All Tasks (Admin)
                            </button>
                        )}
                    </nav>
                    <div className="mt-auto p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${user?.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                        }`}>
                                        {user?.role}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg font-medium transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-8">
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">📋 Task Manager</h1>
                        <button onClick={logout} className="text-sm text-red-600 font-medium cursor-pointer">
                            Logout
                        </button>
                    </div>

                    {/* Mobile Tabs */}
                    {isAdmin && (
                        <div className="md:hidden flex gap-2 mb-4">
                            <button
                                onClick={() => handleTabChange("my-tasks")}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === "my-tasks" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600"
                                    }`}
                            >
                                My Tasks
                            </button>
                            <button
                                onClick={() => handleTabChange("all-tasks")}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === "all-tasks" ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-600"
                                    }`}
                            >
                                All Tasks
                            </button>
                        </div>
                    )}

                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {activeTab === "all-tasks" ? "All Tasks" : "My Tasks"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {activeTab === "all-tasks"
                                    ? "View and manage all users' tasks"
                                    : "Manage and track your tasks"}
                            </p>
                        </div>
                        {activeTab === "my-tasks" && (
                            <button
                                onClick={openCreateModal}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm cursor-pointer"
                            >
                                + New Task
                            </button>
                        )}
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        {activeTab === "my-tasks" && (
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-900"
                            />
                        )}
                        <select
                            value={statusFilter}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-900"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Task List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-500 text-sm">Loading tasks...</p>
                            </div>
                        </div>
                    ) : (activeTab === "my-tasks" ? tasks : adminTasks).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <div className="text-5xl mb-4">📭</div>
                            <h3 className="text-lg font-semibold text-gray-900">No tasks found</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                {searchInput || statusFilter
                                    ? "Try adjusting your filters"
                                    : activeTab === "my-tasks"
                                        ? "Create your first task to get started"
                                        : "No tasks exist in the system yet"}
                            </p>
                            {activeTab === "my-tasks" && !searchInput && !statusFilter && (
                                <button
                                    onClick={openCreateModal}
                                    className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
                                >
                                    + Create Task
                                </button>
                            )}
                        </div>
                    ) : activeTab === "all-tasks" ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {adminTasks.map((task) => (
                                    <AdminTaskCard
                                        key={task.id}
                                        task={task}
                                        onDelete={setDeletingTask}
                                    />
                                ))}
                            </div>
                            <PaginationComponent
                                pagination={pagination}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {tasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={openEditModal}
                                        onDelete={setDeletingTask}
                                    />
                                ))}
                            </div>
                            <PaginationComponent
                                pagination={pagination}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </main>
            </div>

            {/* Create / Edit Modal */}
            <TaskModal
                isOpen={isModalOpen}
                task={editingTask}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTask(null);
                }}
                onSubmit={editingTask ? handleEdit : handleCreate}
            />

            {/* Delete Dialog */}
            <DeleteDialog
                isOpen={deletingTask !== null}
                task={deletingTask}
                loading={deleteLoading}
                onClose={() => setDeletingTask(null)}
                onConfirm={handleDeleteConfirm}
            />

            {/* Toast */}
            <Toast toast={toast} onClose={() => setToast(null)} />
        </ProtectedRoute>
    );
}
