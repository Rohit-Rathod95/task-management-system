"use client";

import { useState, useEffect } from "react";

export interface ToastData {
    message: string;
    type: "success" | "error";
}

interface ToastProps {
    toast: ToastData | null;
    onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Wait for fade-out animation
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) return null;

    const styles = toast.type === "success"
        ? "bg-green-600"
        : "bg-red-600";

    return (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className={`${styles} text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2`}>
                <span>{toast.type === "success" ? "✓" : "✕"}</span>
                {toast.message}
            </div>
        </div>
    );
}
