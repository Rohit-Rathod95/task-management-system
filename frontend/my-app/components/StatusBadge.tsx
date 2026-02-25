export default function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        "pending": "bg-yellow-100 text-yellow-700",
        "in-progress": "bg-blue-100 text-blue-700",
        "completed": "bg-green-100 text-green-700",
    };

    const labels: Record<string, string> = {
        "pending": "Pending",
        "in-progress": "In Progress",
        "completed": "Completed",
    };

    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
            {labels[status] || status}
        </span>
    );
}
