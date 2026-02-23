import { useAuth } from "@/context/AuthContext";
import GuestDashboard from "./GuestDashboard";
import RODashboard from "./RODashboard";
import BranchDashboard from "./BranchDashboard";

export default function DashboardRouter() {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div className="p-8">Loading dashboard...</div>;
    if (!user) return <GuestDashboard />;

    switch (user.role) {
        case "RO":
            return <RODashboard />;
        case "BRANCH":
            return <BranchDashboard />;
        case "ADMIN":
            return <RODashboard />; // Use RO for now
        default:
            return <GuestDashboard />;
    }
}

