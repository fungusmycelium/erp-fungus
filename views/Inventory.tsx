
import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { supabase } from '../lib/supabase';

const mapInventoryItem = (item: any): InventoryItem => ({
  id: item.id,
  name: item.name,
  stock: item.stock,
  lastPrice: Number(item.last_price),
  cost: Number(item.cost),
  category: item.category,
  imageUrl: item.image_url
});

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory_items').select('*');
    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setInventory(data?.map(mapInventoryItem) || []);
    }
  };

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel('inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setInventory(prev => [...prev, mapInventoryItem(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setInventory(prev => prev.map(item => item.id === payload.new.id ? mapInventoryItem(payload.new) : item));
        } else if (payload.eventType === 'DELETE') {
          setInventory(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadgeColor = (stock: number) => {
    if (stock <= 3) return 'bg-danger/10 text-danger border border-danger/20';
    if (stock <= 6) return 'bg-warning/10 text-warning border border-warning/20';
    return 'bg-success/10 text-success border border-success/20';
  };

  return (
    <div className="p-8 h-full flex flex-col bg-background-dark overflow-hidden">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Inventario Maestro</h1>
          <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Existencias, Insumos & Stocks Críticos</p>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex bg-surface-dark border border-surface-accent p-1 rounded-xl">
            <button className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg">Todos</button>
            <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-300">Insumos</button>
            <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-300">Productos Terminado</button>
          </div>
          <div className="relative w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar insumo..."
              className="w-full bg-surface-dark border-surface-accent border rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Tabla de Existencias */}
        <div className="col-span-9 bg-surface-dark/30 rounded-3xl border border-surface-accent overflow-hidden shadow-2xl flex flex-col">
          <div className="overflow-y-auto hide-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-dark border-b border-surface-accent z-10">
                <tr>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre del Producto</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Costo Neto (u)</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Stock</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Valorización Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-accent">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                    <td className="p-5">
                      <span className="text-[9px] font-black px-2 py-1 bg-primary/10 text-primary rounded-full uppercase">{item.category}</span>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Última actualización: Hoy</p>
                    </td>
                    <td className="p-5 text-right font-mono text-slate-400 text-sm">
                      ${Math.round(item.lastPrice / 1.19).toLocaleString()}
                    </td>
                    <td className="p-5 text-center">
                      <div className={`inline-block px-4 py-1 rounded-lg font-mono font-black ${getStockBadgeColor(item.stock)}`}>
                        {item.stock}
                      </div>
                    </td>
                    <td className="p-5 text-right font-black font-mono text-white text-base">
                      ${(item.stock * Math.round(item.lastPrice / 1.19)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen Lateral */}
        <div className="col-span-3 space-y-6 overflow-y-auto hide-scrollbar">
          <div className="bg-primary/5 border border-primary/20 p-8 rounded-3xl shadow-xl text-center">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-6">Capital Inmovilizado</h3>
            <p className="text-4xl font-black text-white font-mono leading-none">
              ${inventory.reduce((a, b) => a + (b.stock * Math.round(b.lastPrice / 1.19)), 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-4">Valorización Neta en Bodega</p>
          </div>

          <div className="bg-surface-dark border border-surface-accent p-6 rounded-3xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Alertas de Stock Bajo</h3>
            <div className="space-y-4">
              {inventory.filter(i => i.stock <= 6).map(i => (
                <div key={i.id} className={`flex items-center gap-3 p-3 rounded-xl border ${i.stock <= 3 ? 'bg-danger/5 border-danger/10' : 'bg-warning/5 border-warning/10'}`}>
                  <span className={`material-symbols-outlined text-base ${i.stock <= 3 ? 'text-danger' : 'text-warning'}`}>
                    {i.stock <= 3 ? 'report' : 'warning'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{i.name}</p>
                    <p className={`text-[10px] font-bold uppercase ${i.stock <= 3 ? 'text-danger' : 'text-warning'}`}>
                      {i.stock} un. restantes
                    </p>
                  </div>
                </div>
              ))}
              {inventory.filter(i => i.stock <= 6).length === 0 && (
                <p className="text-xs text-slate-500 text-center italic py-4">Sin alertas críticas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
