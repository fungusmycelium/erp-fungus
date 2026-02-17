
import React, { useState, useEffect, useRef } from 'react';
import { View, UserRole } from '../types';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, role, setRole, onLogout }) => {
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

  const navItems = [
    { id: View.DASHBOARD, label: 'Panel Principal', icon: 'grid_view', roles: ['ADMIN', 'OPERATOR'] },
    { id: View.SALES_LIST, label: 'Ventas', icon: 'receipt_long', roles: ['ADMIN', 'OPERATOR'] },
    { id: View.PURCHASES_LIST, label: 'Compras', icon: 'payments', roles: ['ADMIN'] },
    { id: View.INVENTORY, label: 'Inventario', icon: 'inventory_2', roles: ['ADMIN', 'OPERATOR'] },
    { id: View.PRODUCT_CATALOG, label: 'Catálogo PVP', icon: 'shopping_bag', roles: ['ADMIN', 'OPERATOR'] },
    { id: View.CRM, label: 'Clientes', icon: 'groups', roles: ['ADMIN', 'OPERATOR'] },
    { id: View.FINANCE, label: 'Finanzas', icon: 'account_balance', roles: ['ADMIN'] },
    { id: View.ANALYSIS, label: 'IA Estratégica', icon: 'psychology', roles: ['ADMIN'] },
  ];

  return (
    <aside className="w-64 h-full bg-background-dark border-r border-surface-accent flex flex-col p-6 z-50">
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

      <nav className="flex-1 space-y-1 overflow-y-auto hide-scrollbar">
        {navItems.filter(item => item.roles.includes(role)).map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${activeView === item.id
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-slate-500 hover:bg-surface-accent hover:text-white'
              }`}
          >
            <span className={`material-icons-round text-xl ${activeView === item.id ? '' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-surface-accent space-y-4">
        <div className="bg-surface-dark p-4 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Cambiar Perfil</p>
          <div className="flex bg-background-dark p-1 rounded-xl">
            <button onClick={() => setRole('ADMIN')} className={`flex-1 py-2 text-[8px] font-black rounded-lg transition-all ${role === 'ADMIN' ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>ADMIN</button>
            <button onClick={() => setRole('OPERATOR')} className={`flex-1 py-2 text-[8px] font-black rounded-lg transition-all ${role === 'OPERATOR' ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>OP</button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <img className="w-10 h-10 rounded-2xl border-2 border-primary/20" src="https://picsum.photos/seed/italo/100/100" alt="Italo" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">Italo T.</p>
            <p className="text-[9px] text-primary font-black uppercase tracking-tighter">{role}</p>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-danger"><span className="material-icons-round text-lg">logout</span></button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
