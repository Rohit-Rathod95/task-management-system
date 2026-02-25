import { AdminTask } from "@/services/taskService";
import StatusBadge from "./StatusBadge";

interface AdminTaskCardProps {
    task: AdminTask;
    onDelete: (task: AdminTask) => void;
}

export default function AdminTaskCard({ task, onDelete }: AdminTaskCardProps) {
    const formattedDate = new Date(task.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                </div>
                <StatusBadge status={task.status} />
            </div>

            {/* User info */}
            <div className="mt-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                    {task.user_name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-500">{task.user_name} · {task.user_email}</span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formattedDate}</span>
                <button
                    onClick={() => onDelete(task)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
