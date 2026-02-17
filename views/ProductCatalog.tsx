
import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

import { supabase } from '../lib/supabase';
import { mapInventoryItem } from '../lib/mappers';

const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('inventory_items').select('*').order('name');
    if (data) setProducts(data.map(mapInventoryItem));
  };

  const handleEdit = (p: InventoryItem) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const handleSave = async () => {
    if (editForm) {
      const { error } = await supabase.from('inventory_items').update({
        name: editForm.name,
        last_price: editForm.lastPrice,
        category: editForm.category,
        image_url: editForm.imageUrl
      }).eq('id', editForm.id);

      if (error) {
        console.error(error);
        alert('Error al actualizar producto');
        return;
      }

      // Optimistic update or refetch
      setProducts(products.map(p => p.id === editForm.id ? editForm : p));
      setEditingId(null);
      setEditForm(null);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 h-full flex flex-col bg-background-dark overflow-hidden">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Catálogo de Venta</h1>
          <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Personalización de Productos e Imágenes</p>
        </div>
        <div className="relative w-80">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500">search</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por nombre..."
            className="w-full bg-surface-dark border-surface-accent border rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto hide-scrollbar flex-1 pb-10">
        {filtered.map(product => (
          <div key={product.id} className={`bg-surface-dark/40 rounded-[2.5rem] border transition-all duration-300 flex flex-col overflow-hidden group ${editingId === product.id ? 'border-primary ring-4 ring-primary/10' : 'border-surface-accent hover:border-primary/40 shadow-xl'}`}>

            {/* VISTA PREVIA IMAGEN */}
            <div className="h-48 bg-background-dark/80 relative flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-20">
                  <span className="material-icons-round text-6xl text-primary">image</span>
                  <span className="text-[10px] font-black uppercase">Sin Imagen</span>
                </div>
              )}
              <div className="absolute top-4 right-4 px-3 py-1 bg-background-dark/90 border border-white/5 rounded-full">
                <span className="text-[9px] font-black text-primary uppercase">{product.category}</span>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              {editingId === product.id ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1">Nombre Comercial</label>
                    <input
                      value={editForm?.name}
                      onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : null)}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase px-1">Precio Bruto</label>
                      <input
                        type="number"
                        value={editForm?.lastPrice}
                        onChange={e => setEditForm(f => f ? { ...f, lastPrice: parseInt(e.target.value) || 0 } : null)}
                        className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase px-1">Categoría</label>
                      <input
                        value={editForm?.category}
                        onChange={e => setEditForm(f => f ? { ...f, category: e.target.value } : null)}
                        className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1">URL Foto (Enlace)</label>
                    <input
                      value={editForm?.imageUrl || ''}
                      onChange={e => setEditForm(f => f ? { ...f, imageUrl: e.target.value } : null)}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white text-[10px] font-black rounded-xl shadow-lg">GUARDAR</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 text-[10px] font-black rounded-xl">CANCELAR</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-black text-white leading-tight pr-4">{product.name}</h3>
                    <button onClick={() => handleEdit(product)} className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-primary transition-colors"><span className="material-icons-round text-sm">edit</span></button>
                  </div>
                  <div className="mt-auto flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Precio de Venta</p>
                      <p className="text-2xl font-black text-white font-mono tracking-tighter">${product.lastPrice.toLocaleString('es-CL')}</p>
                      <p className="text-[8px] text-primary font-black">INC. IVA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
                      <p className={`text-sm font-black font-mono ${product.stock <= 3 ? 'text-danger' : 'text-success'}`}>{product.stock} un.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCatalog;
