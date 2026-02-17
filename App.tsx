import React, { useState, useEffect } from 'react';
import { View, UserRole } from './types';
import Dashboard from './views/Dashboard';
import SalesOrder from './views/SalesOrder';
import PurchaseRegistry from './views/PurchaseRegistry';
import Analysis from './views/Analysis';
import CRM from './views/CRM';
import SalesList from './views/SalesList';
import PurchasesList from './views/PurchasesList';
import Inventory from './views/Inventory';
import ProductCatalog from './views/ProductCatalog';
import Finance from './views/Finance';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
    const [userRole, setUserRole] = useState<UserRole>(() => {
        return (localStorage.getItem('fungus_user_role') as UserRole) || 'ADMIN';
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const isGuest = localStorage.getItem('fungus_guest_mode') === 'true';
        if (isGuest) {
            setSession({ user: { id: 'guest', email: 'invitado@erp.com' } } as any);
            setUserRole('ADMIN');
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) fetchUserRole(session.user.id);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchUserRole(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (data) {
            setUserRole(data.role as UserRole);
            localStorage.setItem('fungus_user_role', data.role);
        }
    };

    useEffect(() => {
        // localStorage.setItem('fungus_user_role', userRole); // Managed by fetchUserRole now
    }, [userRole]);

    const handleLogout = async () => {
        localStorage.removeItem('fungus_guest_mode');
        localStorage.removeItem('fungus_user_role');
        await supabase.auth.signOut();
        setSession(null);
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark text-slate-100">
                <div className="animate-pulse">Cargando ERP Fungus...</div>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    const renderView = () => {
        switch (currentView) {
            case View.DASHBOARD:
                return <Dashboard onNewSale={() => setCurrentView(View.SALES_ORDER)} />;
            case View.SALES_LIST:
                return <SalesList onNew={() => setCurrentView(View.SALES_ORDER)} />;
            case View.PURCHASES_LIST:
                return <PurchasesList onNew={() => setCurrentView(View.PURCHASE_REGISTRY)} />;
            case View.INVENTORY:
                return <Inventory />;
            case View.PRODUCT_CATALOG:
                return <ProductCatalog />;
            case View.CRM:
                return <CRM />;
            case View.FINANCE:
                return <Finance />;
            case View.SALES_ORDER:
                return <SalesOrder onBack={() => setCurrentView(View.SALES_LIST)} />;
            case View.PURCHASE_REGISTRY:
                return <PurchaseRegistry onBack={() => setCurrentView(View.PURCHASES_LIST)} />;
            case View.ANALYSIS:
                return <Analysis />;
            default:
                return <Dashboard onNewSale={() => setCurrentView(View.SALES_ORDER)} />;
        }
    };

    const isFullscreenView = [View.SALES_ORDER, View.PURCHASE_REGISTRY].includes(currentView);

    return (
        <div className="flex h-screen w-full bg-background-dark text-slate-100 overflow-hidden font-display">
            {!isFullscreenView && (
                <Sidebar
                    activeView={currentView}
                    setView={setCurrentView}
                    role={userRole}
                    setRole={setUserRole}
                    onLogout={handleLogout}
                />
            )}

            <main className={`flex-1 overflow-y-auto bg-background-dark ${isFullscreenView ? '' : 'p-2'}`}>
                <div className={`h-full ${isFullscreenView ? '' : 'rounded-3xl border border-surface-accent bg-surface-dark/30 shadow-inner'}`}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;
