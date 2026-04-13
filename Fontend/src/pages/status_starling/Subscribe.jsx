import { Link } from "react-router-dom";

export default function Subscribe() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="w-full max-w-md bg-white border border-gray-200 rounded-md p-8 shadow-sm">

                <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                    Subscribe
                </h1>

                <p className="text-sm text-gray-500 text-center mb-6">
                    Get updates from Sterling Septic & Plumbing LLC
                </p>

                <form className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600">Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-[#1565C0] hover:bg-[#0d47a1] transition-colors text-white text-xs font-semibold tracking-widest px-6 py-2.5 rounded w-full"
                    >
                        Subscribe Now
                    </button>
                </form>

                <div className="mt-5 text-center">
                    <Link to="/status" className="text-sm text-gray-500 hover:text-gray-700">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}