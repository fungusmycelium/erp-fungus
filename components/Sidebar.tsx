
import React, { useState, useEffect, useRef } from 'react';
import { View, UserRole } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, onClose, userRole, onLogout }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem('fungus_company_logo'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoUrl(base64);
        localStorage.setItem('fungus_company_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteLogo = () => {
    if (confirm('¿Deseas eliminar el logo y usar el icono predeterminado?')) {
      setLogoUrl(null);
      localStorage.removeItem('fungus_company_logo');
    }
  };

  // Define a helper component for NavItem to avoid repetition and keep the structure clean
  const NavItem: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${active
        ? 'bg-primary text-white shadow-lg shadow-primary/20'
        : 'text-slate-500 hover:bg-surface-accent hover:text-white'
        }`}
    >
      <span className={`material-icons-round text-xl ${active ? '' : 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <aside className={`fixed md:relative inset-y-0 left-0 w-64 h-full bg-background-dark border-r border-surface-accent flex flex-col p-6 z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="md:hidden flex justify-end mb-4">
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
          <span className="material-icons-round">close</span>
        </button>
      </div>
      <div className="mb-10 text-center relative group">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20 rounded-[2rem] bg-surface-dark flex items-center justify-center shadow-2xl border border-white/5 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo ERP" className="w-full h-full object-cover" />
            ) : (
              <span className="material-icons-round text-primary text-4xl">biotech</span>
            )}

            {/* Overlay de edición */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:text-primary text-white"
                title="Cambiar Logo"
              >
                <span className="material-icons-round text-lg">edit</span>
              </button>
              {logoUrl && (
                <button
                  onClick={deleteLogo}
                  className="p-2 hover:text-danger text-white"
                  title="Eliminar Logo"
                >
                  <span className="material-icons-round text-lg">delete</span>
                </button>
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleLogoUpload}
          />
          <h1 className="text-xl font-black tracking-tighter text-white uppercase">FUNGUS ERP</h1>
        </div>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1">Executive Suite</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
        <NavItem active={currentView === View.DASHBOARD} icon="dashboard" label="Panel Principal" onClick={() => { setCurrentView(View.DASHBOARD); onClose(); }} />
        <NavItem active={currentView === View.SALES_LIST || currentView === View.SALES_ORDER} icon="receipt_long" label="Ventas" onClick={() => { setCurrentView(View.SALES_LIST); onClose(); }} />
        <NavItem active={currentView === View.PURCHASES_LIST || currentView === View.PURCHASE_REGISTRY} icon="shopping_cart" label="Compras" onClick={() => { setCurrentView(View.PURCHASES_LIST); onClose(); }} />
        <NavItem active={currentView === View.INVENTORY} icon="inventory_2" label="Inventario" onClick={() => { setCurrentView(View.INVENTORY); onClose(); }} />
        <NavItem active={currentView === View.CRM} icon="people" label="Clientes" onClick={() => { setCurrentView(View.CRM); onClose(); }} />
        <NavItem active={currentView === View.FINANCE} icon="account_balance_wallet" label="Finanzas" onClick={() => { setCurrentView(View.FINANCE); onClose(); }} />
        <NavItem active={currentView === View.STANDARD_PRODUCTS} icon="fact_check" label="Productos Maestro" onClick={() => { setCurrentView(View.STANDARD_PRODUCTS); onClose(); }} />
        <NavItem active={currentView === View.ANALYSIS} icon="analytics" label="Análisis IA" onClick={() => { setCurrentView(View.ANALYSIS); onClose(); }} />
        {(userRole === 'CEO' || userRole === 'ADMIN') && (
          <NavItem active={currentView === View.USERS} icon="manage_accounts" label="Usuarios" onClick={() => { setCurrentView(View.USERS); onClose(); }} />
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-surface-accent space-y-4">
        {userRole === 'CEO' && (
          <div className="bg-surface-dark p-4 rounded-2xl border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Modo Depuración CEO</p>
            <div className="flex bg-background-dark p-1 rounded-xl">
              <span className="flex-1 py-2 text-[8px] font-black rounded-lg text-center bg-primary text-white">MODO CEO</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-2">
          <img className="w-10 h-10 rounded-2xl border-2 border-primary/20" src="https://picsum.photos/seed/italo/100/100" alt="Italo" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">Italo T.</p>
            <p className="text-[9px] text-primary font-black uppercase tracking-tighter">{userRole}</p>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-danger"><span className="material-icons-round text-lg">logout</span></button>
        </div>
      </div>
    </aside >
  );
};

export default Sidebar;
