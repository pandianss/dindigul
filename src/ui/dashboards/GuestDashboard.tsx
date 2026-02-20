export default function GuestDashboard() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold text-bank-navy mb-2">Welcome to the Bank Portal</h2>
            <p className="text-gray-500 max-w-md">
                Your account is currently under review. Please contact the administrator for access to specific modules.
            </p>
        </div>
    );
}

