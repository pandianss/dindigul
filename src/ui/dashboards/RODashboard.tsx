export default function RODashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-bank-navy">Regional Office Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 border-l-4 border-bank-navy">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Operational Alerts</h3>
                    <div className="text-3xl font-bold text-red-600">03</div>
                    <p className="text-xs text-gray-400 mt-2">Active threshold breaches</p>
                </div>
                <div className="card p-6 border-l-4 border-bank-gold">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Pending Approvals</h3>
                    <div className="text-3xl font-bold text-bank-navy">12</div>
                    <p className="text-xs text-gray-400 mt-2">Across 5 departments</p>
                </div>
                <div className="card p-6 border-l-4 border-bank-teal">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">System Status</h3>
                    <div className="text-xl font-bold text-green-600 uppercase">Operational</div>
                    <p className="text-xs text-gray-400 mt-2">All nodes healthy</p>
                </div>
            </div>
        </div>
    );
}

