
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StandardProduct } from '../types';
import { mapStandardProduct } from '../lib/mappers';

const ProductManager: React.FC = () => {
    const [products, setProducts] = useState<StandardProduct[]>([]);
    const [activeTab, setActiveTab] = useState<'sale' | 'purchase'>('sale');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState<Partial<StandardProduct>>({
        name: '',
        category: '',
        type: 'sale',
        defaultPrice: 0,
        defaultCost: 0
    });

    const fetchProducts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('standard_products')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching standard products:', error);
            alert('Error al cargar productos maestros. Asegúrese de tener conexión.');
        } else {
            setProducts(data?.map(mapStandardProduct) || []);
        }
        setIsLoading(false);
    };

    const syncFromInventory = async () => {
        if (!confirm('¿Desea agregar todos los productos únicos de su inventario actual al catálogo maestro?')) return;
        setIsLoading(true);
        const { data: invData } = await supabase.from('inventory_items').select('*');
        if (invData) {
            const newProducts = invData.map((item: any) => ({
                name: item.name.toUpperCase(),
                category: item.category,
                type: 'sale',
                default_price: item.last_price,
                default_cost: item.cost
            }));

            // Avoid duplicates by name
            const existingNames = new Set(products.map(p => p.name.toUpperCase()));
            const uniqueNew = newProducts.filter(p => !existingNames.has(p.name));

            if (uniqueNew.length > 0) {
                const { error } = await supabase.from('standard_products').insert(uniqueNew);
                if (error) alert('Error al sincronizar: ' + error.message);
                else {
                    alert(`${uniqueNew.length} productos agregados exitosamente.`);
                    fetchProducts();
                }
            } else {
                alert('No hay productos nuevos para sincronizar.');
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSave = async () => {
        if (!editForm.name) {
            alert('El nombre es obligatorio');
            return;
        }

        const payload = {
            name: editForm.name,
            category: editForm.category,
            type: editForm.id ? undefined : activeTab, // Preserve type if editing, set if new
            default_price: editForm.defaultPrice,
            default_cost: editForm.defaultCost
        };

        if (editForm.id) {
            const { error } = await supabase
                .from('standard_products')
                .update(payload)
                .eq('id', editForm.id);

            if (error) alert('Error al actualizar');
            else {
                setProducts(prev => prev.map(p => p.id === editForm.id ? { ...p, ...editForm as StandardProduct } : p));
                setEditForm({ name: '', category: '', type: activeTab, defaultPrice: 0, defaultCost: 0 });
            }
        } else {
            const { data, error } = await supabase
                .from('standard_products')
                .insert([{ ...payload, type: activeTab }])
                .select()
                .single();

            if (error) alert('Error al crear');
            else {
                setProducts(prev => [...prev, mapStandardProduct(data)].sort((a, b) => a.name.localeCompare(b.name)));
                setIsAdding(false);
                setEditForm({ name: '', category: '', type: activeTab, defaultPrice: 0, defaultCost: 0 });
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este producto maestro? Esto no afectará el inventario actual, pero ya no aparecerá como sugerencia.')) {
            const { error } = await supabase.from('standard_products').delete().eq('id', id);
            if (error) alert('Error al eliminar');
            else setProducts(prev => prev.filter(p => p.id !== id));
        }
    };

    const filtered = products.filter(p =>
        p.type === activeTab &&
        (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    );
    const saleCount = products.filter(p => p.type === 'sale').length;
    const purchaseCount = products.filter(p => p.type === 'purchase').length;

    return (
        <div className="p-8 h-full flex flex-col bg-background-dark overflow-hidden">
            <header className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Productos Maestro</h1>
                    <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Estandarización de nombres y categorías</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={syncFromInventory}
                        className="bg-surface-accent text-slate-300 font-bold px-6 py-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-all text-xs flex items-center gap-2"
                        title="Sincronizar desde Inventario actual"
                    >
                        <span className="material-icons-round">sync</span> SINCRONIZAR INVENTARIO
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(true);
                            setEditForm({ name: '', category: '', type: activeTab, defaultPrice: 0, defaultCost: 0 });
                        }}
                        className="bg-primary text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2"
                    >
                        <span className="material-icons-round">add</span> NUEVO PRODUCTO
                    </button>
                </div>
            </header>

            <div className="flex gap-4 mb-8">
                <div className="flex bg-surface-dark border border-surface-accent p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('sale')}
                        className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all flex items-center gap-2 ${activeTab === 'sale' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        PARA VENTA <span className="opacity-50 font-mono">({saleCount})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('purchase')}
                        className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all flex items-center gap-2 ${activeTab === 'purchase' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        PARA COMPRA <span className="opacity-50 font-mono">({purchaseCount})</span>
                    </button>
                </div>

                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500">search</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o categoría..."
                        className="w-full bg-surface-dark border-surface-accent border rounded-2xl py-3 pl-12 pr-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            <div className="flex-1 bg-surface-dark/30 rounded-[3rem] border border-surface-accent overflow-hidden flex flex-col shadow-2xl relative">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="material-icons-round animate-spin text-primary text-4xl">refresh</span>
                    </div>
                ) : (
                    <div className="overflow-y-auto hide-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-surface-dark border-b border-surface-accent z-10">
                                <tr>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Producto</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoría</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">
                                        {activeTab === 'sale' ? 'Precio Sugerido (Bruto)' : 'Costo Sugerido (Neto)'}
                                    </th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-accent">
                                {filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-black text-white text-sm uppercase">{p.name}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[9px] font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full uppercase border border-white/10 group-hover:border-primary/20 group-hover:text-primary transition-all">
                                                {p.category || 'Sin Categoría'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right font-mono font-black text-white text-base">
                                            ${(activeTab === 'sale' ? p.defaultPrice : p.defaultCost).toLocaleString('es-CL')}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditForm(p)}
                                                    className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="w-9 h-9 bg-danger/10 text-danger rounded-xl flex items-center justify-center hover:bg-danger hover:text-white transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Formulario Modal o Drawer para Edición/Creación */}
                {(isAdding || editForm.id) && (
                    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8">
                        <div className="bg-surface-dark w-full max-w-lg p-10 rounded-[3rem] border border-primary/20 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-xl font-black text-white uppercase">{editForm.id ? 'Editar Producto' : 'Nuevo Producto Maestro'}</h3>
                                <button onClick={() => { setIsAdding(false); setEditForm({ name: '', category: '', type: activeTab, defaultPrice: 0, defaultCost: 0 }); }} className="text-slate-500 hover:text-white transition-colors">
                                    <span className="material-icons-round">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2 px-1">Nombre Oficial</label>
                                    <input
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="Ej: Mezcla Maestra Fungus"
                                        className="w-full bg-background-dark border-surface-accent border-2 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary outline-none transition-all uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2 px-1">Categoría</label>
                                    <input
                                        value={editForm.category}
                                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                        placeholder="Ej: Mezclas, Insumos, Accesorios"
                                        className="w-full bg-background-dark border-surface-accent border-2 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2 px-1">Prec/Cost Sugerido</label>
                                        <input
                                            type="number"
                                            value={activeTab === 'sale' ? editForm.defaultPrice : editForm.defaultCost}
                                            onChange={e => setEditForm({
                                                ...editForm,
                                                [activeTab === 'sale' ? 'defaultPrice' : 'defaultCost']: parseFloat(e.target.value) || 0
                                            })}
                                            className="w-full bg-background-dark border-surface-accent border-2 rounded-2xl py-4 px-6 text-sm text-white font-mono focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Tipo definido</label>
                                        <div className="h-14 bg-background-dark/50 border border-white/5 rounded-2xl flex items-center px-6">
                                            <span className="text-[10px] font-black text-white uppercase">{activeTab === 'sale' ? 'PRODUCTO VENTA' : 'PRODUCTO COMPRA'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 mt-6 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
                                >
                                    {editForm.id ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO MAESTRO'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductManager;
