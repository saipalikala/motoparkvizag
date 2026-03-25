import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./AdminLayout.css";

const AdminLayout = () => (
    <div className="al-layout">
        <AdminSidebar />
        <div className="al-main">
            <AdminTopbar />
            <div className="al-content">
                <Outlet />
            </div>
        </div>
    </div>
);

export default AdminLayout;