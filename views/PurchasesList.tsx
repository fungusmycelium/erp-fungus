
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PurchaseRecord } from '../types';

const mapPurchaseRecord = (p: any): PurchaseRecord => ({
  id: p.id,
  provider: p.provider,
  rut: p.rut,
  docNumber: p.doc_number,
  docType: p.doc_type,
  date: p.date,
  total: Number(p.total),
  paymentMethod: p.payment_method,
  category: p.category || 'Insumos',
  items: p.items?.map((i: any) => ({
    id: i.id,
    name: i.item_name,
    qty: i.qty,
    price: Number(i.cost), // Map cost to price for UI display which expects 'price'
    cost: Number(i.cost)
  })) || []
});

const PurchasesList: React.FC<{ onNew: () => void }> = ({ onNew }) => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, items:purchase_items(*)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
    } else {
      setPurchases(data?.map(mapPurchaseRecord) || []);
    }
  };

  useEffect(() => {
    fetchPurchases();

    const channel = supabase
      .channel('purchases_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        fetchPurchases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar registro de compra permanentemente?')) {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar compra');
        console.error(error);
      } else {
        setPurchases(purchases.filter(p => p.id !== id));
      }
    }
  };

  const filtered = purchases.filter(p =>
    p.provider.toLowerCase().includes(search.toLowerCase()) || p.docNumber.includes(search)
  );

  const selectedPurchase = purchases.find(p => p.id === viewingId);

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">Historial de Compras</h1>
          <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Gestión Centralizada de Egresos</p>
        </div>
        <div className="flex gap-4 items-center">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por folio..."
            className="bg-surface-dark border-surface-accent border rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
          />
          <button onClick={onNew} className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <span className="material-icons-round">add</span> Nueva Compra
          </button>
        </div>
      </header>

      <div className="flex-1 bg-surface-dark/30 rounded-3xl border border-surface-accent overflow-hidden flex flex-col shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-surface-dark border-b border-surface-accent">
            <tr>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Folio</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Proveedor</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Categoría</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Fecha</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500 text-right">Monto Total</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-accent">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                <td className="p-5 font-mono text-primary font-bold">{p.docNumber}</td>
                <td className="p-5">
                  <p className="text-sm font-bold text-white">{p.provider}</p>
                  <p className="text-[10px] text-slate-500">{p.rut}</p>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${p.category === 'Activos' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    p.category === 'Venta' ? 'bg-success/20 text-success border-success/30' :
                      'bg-primary/20 text-primary border-primary/30'
                    }`}>
                    {p.category || 'Insumos'}
                  </span>
                </td>
                <td className="p-5 text-sm text-slate-400">{new Date(p.date).toLocaleDateString('es-CL')}</td>
                <td className="p-5 text-right font-black font-mono text-white text-base">${p.total.toLocaleString('es-CL')}</td>
                <td className="p-5">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setViewingId(p.id)} className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"><span className="material-icons-round text-sm">visibility</span></button>
                    <button onClick={() => handleDelete(p.id)} className="w-9 h-9 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:text-danger transition-all"><span className="material-icons-round text-sm">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL VISUALIZADOR */}
      {viewingId && selectedPurchase && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-12 rounded-[3rem] relative text-black shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setViewingId(null)} className="absolute top-8 right-8 text-slate-400 hover:text-danger"><span className="material-icons-round">close</span></button>
            <h2 className="text-2xl font-black mb-6 uppercase border-b-4 border-primary pb-2 inline-block text-black">Detalle de Compra</h2>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-600 uppercase">Proveedor</p>
                <p className="font-black text-lg text-black">{selectedPurchase.provider}</p>
                <p className="text-xs font-mono font-bold text-slate-800">{selectedPurchase.rut}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase">Documento</p>
                <p className="font-black text-lg text-black">{selectedPurchase.docType} N° {selectedPurchase.docNumber}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-[9px] font-black text-white px-2 py-0.5 bg-slate-900 rounded-lg uppercase tracking-widest">{selectedPurchase.category || 'Insumos'}</span>
                  <p className="text-xs text-slate-800 font-bold">{new Date(selectedPurchase.date).toLocaleDateString('es-CL')}</p>
                </div>
              </div>
            </div>
            <table className="w-full text-left mb-8 border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                <tr>
                  <th className="p-4 rounded-l-xl">Item</th>
                  <th className="p-4 text-center">Cant</th>
                  <th className="p-4 text-right rounded-r-xl">Costo Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedPurchase.items.map(it => (
                  <tr key={it.id} className="text-sm font-bold text-black">
                    <td className="p-4">{it.name}</td>
                    <td className="p-4 text-center font-mono">{it.qty}</td>
                    <td className="p-4 text-right font-mono">${it.price.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right p-8 bg-slate-900 rounded-3xl text-white shadow-xl">
              <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-50">Total con IVA (19%)</p>
              <p className="text-4xl font-black font-mono tracking-tighter">${selectedPurchase.total.toLocaleString('es-CL')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesList;
