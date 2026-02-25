import api from "@/lib/api";

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: "pending" | "in-progress" | "completed";
    created_at: string;
}

export interface AdminTask extends Task {
    user_id: string;
    user_name: string;
    user_email: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface GetTasksParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export const taskService = {
    async getTasks(params: GetTasksParams = {}) {
        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.status) query.set("status", params.status);
        if (params.search) query.set("search", params.search);

        const res = await api.get(`/tasks?${query.toString()}`);
        return res.data.data as { tasks: Task[]; pagination: PaginationMeta };
    },

    async createTask(data: { title: string; description?: string; status?: string }) {
        const res = await api.post("/tasks", data);
        return res.data.data.task as Task;
    },

    async updateTask(id: string, data: { title?: string; description?: string; status?: string }) {
        const res = await api.put(`/tasks/${id}`, data);
        return res.data.data.task as Task;
    },

    async deleteTask(id: string) {
        await api.delete(`/tasks/${id}`);
    },

    // Admin endpoints
    async getAllTasks(params: GetTasksParams = {}) {
        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.status) query.set("status", params.status);

        const res = await api.get(`/admin/tasks?${query.toString()}`);
        return res.data.data as { tasks: AdminTask[]; pagination: PaginationMeta };
    },

    async deleteAnyTask(id: string) {
        await api.delete(`/admin/tasks/${id}`);
    },

    async getAllUsers() {
        const res = await api.get("/admin/users");
        return res.data.data as { users: User[]; count: number };
    },
};
