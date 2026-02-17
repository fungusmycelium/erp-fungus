
import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  activeView: View;
  setView: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setView }) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Inicio', icon: 'grid_view' },
    { id: View.SALES_LIST, label: 'Ventas', icon: 'receipt_long' },
    { id: View.PURCHASES_LIST, label: 'Compras', icon: 'payments' },
    { id: View.INVENTORY, label: 'Inventario', icon: 'inventory_2' },
    { id: View.CRM, label: 'Clientes', icon: 'groups' },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[480px] bg-background-dark/95 ios-blur border-t border-surface-accent px-2 pt-3 pb-8 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activeView === item.id ? 'text-primary scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="material-icons-round text-[22px]">{item.icon}</span>
          <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
