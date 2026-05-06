import { Suspense, useCallback, useState, Component, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { ToastProvider } from "../components/ui/ToastProvider";
import "./AdminLayout.css";

/* ================================================================
   QUICK ACTION CONTEXT
   Pages subscribe to this to open their "Add/Create" modal
   when the topbar button is pressed.
   Usage in a page:
     const { on } = useQuickAction();
     useEffect(() => on('/admin/products', () => setShowModal(true)), []);
   ================================================================ */
const QuickActionCtx = createContext(null);

export const useQuickAction = () => useContext(QuickActionCtx);

/* ================================================================
   ERROR BOUNDARY
   ================================================================ */
class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("[AdminLayout] Page error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="al-error">
                    <div className="al-error__icon">⚠</div>
                    <h2 className="al-error__title">Something went wrong</h2>
                    <p className="al-error__msg">{this.state.error?.message}</p>
                    <button
                        className="al-error__btn"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

/* ================================================================
   PAGE SKELETON — shown while lazy chunks load
   ================================================================ */
const PageSkeleton = () => (
    <div className="al-skeleton" role="status" aria-label="Loading page">
        <div className="al-skeleton__header" />
        <div className="al-skeleton__row" />
        <div className="al-skeleton__row al-skeleton__row--short" />
        <div className="al-skeleton__grid">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="al-skeleton__card" />
            ))}
        </div>
    </div>
);

/* ================================================================
   ADMIN LAYOUT SHELL
   ================================================================ */
const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Stable refs — AdminSidebar/AdminTopbar memo cache never busts
    const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    // Quick action registry: { [path]: handler }
    const [actionRegistry] = useState(() => new Map());

    const registerAction = useCallback((path, handler) => {
        actionRegistry.set(path, handler);
        return () => actionRegistry.delete(path);  // cleanup
    }, [actionRegistry]);

    const handleQuickAction = useCallback((pathname) => {
        actionRegistry.get(pathname)?.();
    }, [actionRegistry]);

    const quickActionCtx = { on: registerAction };

    return (
        <ToastProvider>   {/* ← add this */}
        <QuickActionCtx.Provider value={quickActionCtx}>
            <div className="al-layout">

                {/* Mobile backdrop — opacity-only = GPU compositor */}
                {sidebarOpen && (
                    <div
                        className="al-backdrop"
                        onClick={closeSidebar}
                        aria-hidden="true"
                    />
                )}

                {/* Sidebar: NEVER re-renders on route change */}
                <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

                <div className="al-main">
                    {/* Topbar: re-renders only on pathname change */}
                    <AdminTopbar
                        onMenuToggle={openSidebar}
                        onQuickAction={handleQuickAction}
                    />

                    {/* Content: isolated scroll layer */}
                    <div
                        className="al-content"
                        id="main-content"
                        role="main"
                    >
                        <ErrorBoundary>
                            <Suspense fallback={<PageSkeleton />}>
                                <Outlet />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </div>

            </div>
        </QuickActionCtx.Provider>
        </ToastProvider>  

    );
};

export default AdminLayout;