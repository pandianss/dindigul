export default function BranchDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-bank-navy">Branch Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold mb-4">Branch Performance</h3>
                    <p className="text-sm text-gray-500">Target vs Achievement tracking will appear here.</p>
                </div>
                <div className="card p-6 text-white bg-bank-navy">
                    <h3 className="text-lg font-bold mb-2">Notice from RO</h3>
                    <p className="text-blue-100 text-sm">Please submit the quarterly audit reports by Friday.</p>
                </div>
            </div>
        </div>
    );
}

