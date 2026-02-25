import { PaginationMeta } from "@/services/taskService";

interface PaginationProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
    const { page, totalPages, total } = pagination;

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
                {total} total task{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
