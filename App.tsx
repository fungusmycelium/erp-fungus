import React, { useState, useEffect } from 'react';
import { View, UserRole } from './types';

export type ExtendedRole = 'CEO' | 'SUPERVISOR' | 'VENDEDOR' | 'ADMIN' | 'OPERATOR';

import Dashboard from './views/Dashboard';
import SalesOrder from './views/SalesOrder';
import PurchaseRegistry from './views/PurchaseRegistry';
import Analysis from './views/Analysis';
import Users from './views/Users';
import CRM from './views/CRM';
import SalesList from './views/SalesList';
import PurchasesList from './views/PurchasesList';
import Inventory from './views/Inventory';
import ProductCatalog from './views/ProductCatalog';
import ProductManager from './views/ProductManager';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
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

        const isEmergencyCEO = session?.user.email === 'italotavonatti@gmail.com';

        if (data) {
            let role = data.role as UserRole;
            // Force CEO role for the owner if not already set or if it changed
            if (isEmergencyCEO && role !== 'CEO') {
                role = 'CEO';
                await supabase.from('profiles').update({
                    role: 'CEO',
                    email: session?.user.email,
                    full_name: (session?.user.user_metadata as any)?.full_name || (session?.user.user_metadata as any)?.name
                }).eq('id', userId);
            } else if (session?.user.email) {
                // Keep email and name synced
                await supabase.from('profiles').update({
                    email: session.user.email,
                    full_name: (session?.user.user_metadata as any)?.full_name || (session?.user.user_metadata as any)?.name
                }).eq('id', userId);
            }
            setUserRole(role);
            localStorage.setItem('fungus_user_role', role);
        } else if (error && session) {
            // Profile doesn't exist, create it
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const isFirstUser = count === 0;
            const newRole: UserRole = (isFirstUser || isEmergencyCEO) ? 'CEO' : 'VENDEDOR';

            const { error: insertError } = await supabase.from('profiles').insert([
                {
                    id: userId,
                    role: newRole,
                    email: session.user.email,
                    full_name: (session?.user.user_metadata as any)?.full_name || (session?.user.user_metadata as any)?.name
                }
            ]);

            if (!insertError) {
                setUserRole(newRole);
                localStorage.setItem('fungus_user_role', newRole);
            }
        }
    };

    useEffect(() => {
        // localStorage.setItem('fungus_user_role', userRole); // Managed by fetchUserRole now
    }, [userRole]);

    const handleLogout = async () => {
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
            case View.USERS:
                return <Users currentRole={(userRole as any)} />;
            case View.STANDARD_PRODUCTS:
                return <ProductManager />;
            default:
                return <Dashboard onNewSale={() => setCurrentView(View.SALES_ORDER)} />;
        }
    };

    const isFullscreenView = [View.SALES_ORDER, View.PURCHASE_REGISTRY].includes(currentView);

    return (
        <div className="flex h-screen w-full bg-background-dark text-slate-100 overflow-hidden font-display relative">
            {!isFullscreenView && (
                <>
                    {/* Burger Menu for Mobile */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden fixed top-6 left-6 z-40 p-2 bg-surface-dark border border-surface-accent rounded-xl text-primary"
                    >
                        <span className="material-icons-round">menu</span>
                    </button>

                    <Sidebar
                        currentView={currentView}
                        setCurrentView={(view) => {
                            setCurrentView(view);
                            setIsSidebarOpen(false); // Close on mobile navigation
                        }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        userRole={(userRole as any)}
                        onLogout={handleLogout}
                    />

                    {/* Mobile Overlay */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-300"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                </>
            )}

            <main className={`flex-1 overflow-y-auto bg-background-dark transition-all duration-300 ${isFullscreenView ? '' : 'p-2 pt-20 md:pt-2'}`}>
                <div className={`h-full ${isFullscreenView ? '' : 'rounded-3xl border border-surface-accent bg-surface-dark/30 shadow-inner'}`}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;
