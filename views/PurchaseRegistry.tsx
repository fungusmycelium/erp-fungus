
import React, { useState, useEffect } from 'react';
// Fix: removed non-existent 'Provider' member from import list
import { supabase } from '../lib/supabase';
import { PurchaseRecord, OrderItem, InventoryItem, PaymentMethod } from '../types';
import { formatRut } from '../lib/utils';

const PurchaseRegistry: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    rut: '',
    providerName: '',
    address: '',
    giro: '',
    docType: 'Factura' as 'Factura' | 'Boleta',
    docNumber: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Transferencia' as PaymentMethod,
    category: 'Insumos' as any
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', qty: 1, cost: 0, sellPrice: 0, category: 'Insumos' as any });
  const [matchingProviders, setMatchingProviders] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [matchingStandardProducts, setMatchingStandardProducts] = useState<any[]>([]);
  const [showProductAutocomplete, setShowProductAutocomplete] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetchInv = async () => {
      const { data } = await supabase.from('inventory_items').select('*');
      if (data) {
        setInventory(data.map((item: any) => ({
          id: item.id,
          name: item.name,
          stock: item.stock,
          lastPrice: Number(item.last_price),
          cost: Number(item.cost),
          category: item.category,
          imageUrl: item.image_url
        })));
      }
    };
    fetchInv();
  }, []);

  const searchProvider = async (rut: string) => {
    const cleanRut = rut.replace(/\./g, '').replace('-', '');
    if (cleanRut.length < 3) {
      setMatchingProviders([]);
      setShowAutocomplete(false);
      return;
    }
    const { data } = await supabase
      .from('providers')
      .select('*')
      .ilike('rut', `%${rut}%`)
      .limit(5);

    if (data) {
      setMatchingProviders(data);
      setShowAutocomplete(data.length > 0);
    }
  };

  const selectProvider = (p: any) => {
    setFormData({
      ...formData,
      rut: p.rut,
      providerName: p.name,
      address: p.address || '',
      giro: p.giro || '',
    });
    setMatchingProviders([]);
    setShowAutocomplete(false);
  };

  const searchStandardProduct = async (name: string) => {
    // 1. Local Inventory Search
    const localMatches = inventory
      .filter(i => !name || i.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        default_cost: i.cost,
        is_inventory: true,
        stock: i.stock
      }));

    if (name.length < 2) {
      setMatchingStandardProducts(localMatches);
      setShowProductAutocomplete(localMatches.length > 0);
      return;
    }

    // 2. Database Search
    const { data } = await supabase
      .from('standard_products')
      .select('*')
      .eq('type', 'purchase')
      .ilike('name', `%${name}%`)
      .limit(5);

    const dbMatches = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      default_cost: p.default_cost,
      is_inventory: false
    }));

    // 3. Combine
    const combined = [...localMatches];
    dbMatches.forEach(dbItem => {
      if (!combined.find(c => c.name.toLowerCase() === dbItem.name.toLowerCase())) {
        combined.push(dbItem);
      }
    });

    setMatchingStandardProducts(combined.slice(0, 8));
    setShowProductAutocomplete(combined.length > 0);
  };

  const selectStandardProduct = (p: any) => {
    setNewItem({
      ...newItem,
      name: p.name.toUpperCase(),
      cost: Number(p.default_cost) || 0
    });
    setMatchingStandardProducts([]);
    setShowProductAutocomplete(false);
  };

  const totalCost = items.reduce((acc, it) => acc + (it.price * it.qty), 0);

  const isStep1Valid = () => {
    return !!formData.rut && !!formData.providerName && !!formData.docNumber;
  };

  const isStep2Valid = () => {
    return items.length > 0;
  };

  const addItem = () => {
    const isVenta = newItem.category === 'Venta';
    const hasName = !!newItem.name;
    const hasCost = newItem.cost > 0;
    const hasSellPrice = newItem.sellPrice > 0;

    if (!hasName || !hasCost || (isVenta && !hasSellPrice)) {
      alert(isVenta ? "Indique nombre, costo y precio de venta esperado." : "Indique nombre y costo del item.");
      return;
    }
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      qty: newItem.qty,
      price: newItem.cost, // Costo neto para registro de compra
      cost: newItem.sellPrice, // Usamos el campo cost temporalmente para guardar el sellPrice deseado
      category: newItem.category
    }]);
    setNewItem({ name: '', qty: 1, cost: 0, sellPrice: 0, category: formData.category });
  };

  const handleSave = async () => {
    // 0. Save/Update Provider data
    const providerPayload = {
      name: formData.providerName,
      rut: formData.rut,
      address: formData.address,
      giro: formData.giro
    };

    const { data: existingProv } = await supabase.from('providers').select('id').eq('rut', formData.rut).maybeSingle();
    if (existingProv) {
      await supabase.from('providers').update(providerPayload).eq('id', existingProv.id);
    } else {
      await supabase.from('providers').insert([providerPayload]);
    }

    // 1. Save Purchase
    const { data: newPurchase, error: purchError } = await supabase.from('purchases').insert([{
      provider: formData.providerName,
      rut: formData.rut,
      doc_number: formData.docNumber,
      doc_type: formData.docType,
      date: formData.date,
      total: totalCost * 1.19,
      payment_method: formData.paymentMethod,
      category: items[0]?.category || 'Insumos'
    }]).select().single();

    if (purchError) {
      alert('Error guardando compra');
      console.error(purchError);
      return;
    }

    // 2. Save Items & Update Inventory
    for (const item of items) {
      // Check if item exists in inventory (by name)
      const { data: existingItem } = await supabase.from('inventory_items').select('*').ilike('name', item.name).maybeSingle();

      let itemId = existingItem?.id;

      if (existingItem) {
        // Update Stock, Cost, Price
        await supabase.from('inventory_items').update({
          stock: existingItem.stock + item.qty,
          cost: item.price, // Net cost
          last_price: item.cost // Sell Price (mapped from temp field)
        }).eq('id', itemId);
      } else {
        // Create new inventory item
        const { data: newItem } = await supabase.from('inventory_items').insert([{
          name: item.name,
          stock: item.qty,
          cost: item.price,
          last_price: item.cost,
          category: item.category || 'Insumos',
          image_url: 'https://images.unsplash.com/photo-1621841957884-a21c97a89a03?q=80&w=200&auto=format&fit=crop' // Default image
        }]).select().single();
        itemId = newItem?.id;
      }

      // Create Purchase Item
      await supabase.from('purchase_items').insert({
        purchase_id: newPurchase.id,
        // inventory_item_id: itemId, // Optional if we link them
        item_name: item.name,
        qty: item.qty,
        cost: item.price
      });
    }

    alert("¡Compra Guardada! Precios de venta actualizados en el catálogo.");
    onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark p-8 overflow-hidden">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-white">Registro de Compra</h1>
          <p className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Paso {step} de 2 • Gestión de Insumos</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="px-6 py-3 bg-surface-accent text-slate-300 font-bold rounded-xl">Cancelar</button>
          {step === 2 && (
            <button onClick={handleSave} className="px-10 py-3 bg-primary text-white font-black rounded-xl shadow-xl shadow-primary/30">Guardar Compra</button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full">
        {step === 1 && (
          <div className="bg-surface-dark/40 p-10 rounded-[3rem] border border-surface-accent space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Datos del Documento</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">RUT Proveedor *</label>
                <input
                  value={formData.rut}
                  onChange={e => {
                    const val = formatRut(e.target.value);
                    setFormData({ ...formData, rut: val });
                    searchProvider(val);
                  }}
                  onFocus={() => {
                    if (matchingProviders.length > 0) setShowAutocomplete(true);
                  }}
                  placeholder="12.345.678-9"
                  className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm"
                />
                {showAutocomplete && (
                  <div className="absolute z-50 w-full mt-1 bg-surface-dark border border-surface-accent rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {matchingProviders.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectProvider(p)}
                        className="w-full text-left px-4 py-3 hover:bg-primary/20 border-b border-white/5 last:border-0 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.rut}</p>
                          </div>
                          <span className="material-icons-round text-primary text-sm">arrow_forward</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Overlay para cerrar */}
                {showAutocomplete && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowAutocomplete(false)}></div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">Razón Social *</label>
                <input value={formData.providerName} onChange={e => setFormData({ ...formData, providerName: e.target.value })} placeholder="Fungus Corp" className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">N° Documento *</label>
                <input value={formData.docNumber} onChange={e => setFormData({ ...formData, docNumber: e.target.value })} placeholder="Ex: 5542" className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">Fecha Contable *</label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">Tipo Documento</label>
                <select value={formData.docType} onChange={e => setFormData({ ...formData, docType: e.target.value as any })} className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm">
                  <option value="Factura">Factura</option>
                  <option value="Boleta">Boleta</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => isStep1Valid() ? setStep(2) : alert("Complete todos los campos obligatorios.")}
              className={`w-full py-4 font-black rounded-2xl uppercase tracking-widest transition-all ${isStep1Valid() ? 'bg-primary text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              Continuar al Detalle
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-surface-dark/40 p-10 rounded-[3rem] border border-surface-accent space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="bg-background-dark/50 p-8 rounded-3xl border border-primary/20 space-y-4">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Añadir Producto e Inteligencia de Precios</h4>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 relative">
                  <input
                    value={newItem.name}
                    onChange={e => {
                      setNewItem({ ...newItem, name: e.target.value });
                      searchStandardProduct(e.target.value);
                    }}
                    onFocus={() => {
                      if (matchingStandardProducts.length > 0) setShowProductAutocomplete(true);
                    }}
                    className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm uppercase"
                    placeholder="Nombre del Producto Insumo (Sugerido)"
                  />
                  {showProductAutocomplete && (
                    <div className="absolute z-50 w-full mt-1 bg-surface-dark border border-surface-accent rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {matchingStandardProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectStandardProduct(p)}
                          className="w-full text-left px-4 py-3 hover:bg-primary/20 border-b border-white/5 last:border-0 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.is_inventory ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-icons-round text-xs">{p.is_inventory ? 'inventory_2' : 'fact_check'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-black text-white uppercase">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{p.is_inventory ? 'En Inventario' : 'Catálogo Maestro'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase">Costo Sugerido</p>
                              <p className="text-xs font-black text-white font-mono">${Number(p.default_cost).toLocaleString('es-CL')}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showProductAutocomplete && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowProductAutocomplete(false)}></div>
                  )}
                </div>
                <div className="col-span-3">
                  <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cant.</label>
                  <input type="number" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                </div>
                <div className="col-span-4">
                  <label className="text-[8px] font-black text-slate-500 uppercase px-1">Costo Neto (U)</label>
                  <input type="number" value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                </div>
                <div className={newItem.category === 'Venta' ? 'col-span-4' : 'col-span-8'}>
                  {newItem.category === 'Venta' && (
                    <>
                      <label className="text-[8px] font-black text-primary uppercase px-1">Precio Venta Sugerido (U)</label>
                      <input type="number" value={newItem.sellPrice} onChange={e => setNewItem({ ...newItem, sellPrice: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-primary/20 border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                    </>
                  )}
                  {newItem.category !== 'Venta' && (
                    <div className="flex items-center h-full pt-4">
                      <p className="text-[10px] text-slate-500 italic font-medium px-2">No requiere precio de venta (Uso interno / Activo)</p>
                    </div>
                  )}
                </div>
                <div className="col-span-12 grid grid-cols-3 gap-3">
                  {['Insumos', 'Venta', 'Activos'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewItem({ ...newItem, category: cat as any })}
                      className={`py-2 rounded-xl border font-black text-[9px] transition-all uppercase tracking-widest ${newItem.category === cat ? 'bg-primary border-primary text-white shadow-lg' : 'bg-background-dark border-surface-accent text-slate-500 hover:border-primary/40'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button onClick={addItem} className="col-span-12 bg-primary text-white py-3 rounded-xl flex items-center justify-center font-black uppercase text-[10px] gap-2">
                  <span className="material-icons-round">add</span> AÑADIR PRODUCTO
                </button>
              </div>
              {newItem.cost > 0 && newItem.sellPrice > 0 && (
                <p className="text-[9px] font-black text-success uppercase">Ganancia Estimada por Unidad: ${(newItem.sellPrice - (newItem.cost * 1.19)).toLocaleString('es-CL')}</p>
              )}
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto hide-scrollbar">
              {items.map(it => (
                <div key={it.id} className="flex justify-between items-center p-4 bg-background-dark/30 rounded-2xl border border-surface-accent">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{it.name}</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${it.category === 'Activos' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                        it.category === 'Venta' ? 'bg-success/20 text-success border-success/30' :
                          'bg-primary/20 text-primary border-primary/30'
                        }`}>
                        {it.category || 'Insumo'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase">
                      Costo: ${it.price} {it.category === 'Venta' ? `| PVP: $${it.cost}` : ''} | Cant: {it.qty}
                    </p>
                  </div>
                  <button onClick={() => setItems(items.filter(x => x.id !== it.id))} className="text-danger"><span className="material-icons-round">delete</span></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRegistry;
