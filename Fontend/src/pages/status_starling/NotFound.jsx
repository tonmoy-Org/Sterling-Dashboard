import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <AlertCircle className="w-20 h-20 text-[#1565C0]" />
                </div>
                <h1 className="text-7xl font-bold text-gray-800 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Page Not Found
                </h2>
                <p className="text-gray-500 mb-6">
                    The page you’re looking for doesn’t exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-block bg-[#1565C0] hover:bg-[#0d47a1] text-white text-sm font-semibold px-6 py-2.5 rounded transition-colors"
                >
                    Go Back Home
                </Link>
            </div>
        </div>
    );
}