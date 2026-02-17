
import React, { useState, useEffect } from 'react';
// Fix: removed non-existent 'Provider' member from import list
import { supabase } from '../lib/supabase';
import { PurchaseRecord, OrderItem, InventoryItem, PaymentMethod } from '../types';

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
    paymentMethod: 'Transferencia' as PaymentMethod
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', qty: 1, cost: 0, sellPrice: 0 });

  const totalCost = items.reduce((acc, it) => acc + (it.price * it.qty), 0);

  const isStep1Valid = () => {
    return !!formData.rut && !!formData.providerName && !!formData.docNumber;
  };

  const isStep2Valid = () => {
    return items.length > 0;
  };

  const addItem = () => {
    if (!newItem.name || newItem.cost <= 0 || newItem.sellPrice <= 0) {
      alert("Indique nombre, costo y precio de venta esperado.");
      return;
    }
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      qty: newItem.qty,
      price: newItem.cost, // Costo neto para registro de compra
      cost: newItem.sellPrice // Usamos el campo cost temporalmente para guardar el sellPrice deseado
    }]);
    setNewItem({ name: '', qty: 1, cost: 0, sellPrice: 0 });
  };

  const handleSave = async () => {
    // 1. Save Purchase
    const { data: newPurchase, error: purchError } = await supabase.from('purchases').insert([{
      provider: formData.providerName,
      rut: formData.rut,
      doc_number: formData.docNumber,
      doc_type: formData.docType,
      date: formData.date,
      total: totalCost * 1.19,
      payment_method: formData.paymentMethod
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
          category: 'Insumos',
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
              <input value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} placeholder="RUT Proveedor *" className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              <input value={formData.providerName} onChange={e => setFormData({ ...formData, providerName: e.target.value })} placeholder="Razón Social *" className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              <input value={formData.docNumber} onChange={e => setFormData({ ...formData, docNumber: e.target.value })} placeholder="N° Documento *" className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm" />
              <select value={formData.docType} onChange={e => setFormData({ ...formData, docType: e.target.value as any })} className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-white text-sm">
                <option value="Factura">Factura</option>
                <option value="Boleta">Boleta</option>
              </select>
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
                <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="col-span-12 bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Nombre del Producto Insumo" />
                <div className="col-span-3">
                  <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cant.</label>
                  <input type="number" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                </div>
                <div className="col-span-4">
                  <label className="text-[8px] font-black text-slate-500 uppercase px-1">Costo Neto (U)</label>
                  <input type="number" value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                </div>
                <div className="col-span-4">
                  <label className="text-[8px] font-black text-primary uppercase px-1">Precio Venta Sugerido (U)</label>
                  <input type="number" value={newItem.sellPrice} onChange={e => setNewItem({ ...newItem, sellPrice: parseInt(e.target.value) || 0 })} className="w-full bg-background-dark border-primary/20 border rounded-xl py-3 px-4 text-white text-sm font-mono" />
                </div>
                <button onClick={addItem} className="col-span-1 bg-primary text-white rounded-xl flex items-center justify-center"><span className="material-icons-round">add</span></button>
              </div>
              {newItem.cost > 0 && newItem.sellPrice > 0 && (
                <p className="text-[9px] font-black text-success uppercase">Ganancia Estimada por Unidad: ${(newItem.sellPrice - (newItem.cost * 1.19)).toLocaleString('es-CL')}</p>
              )}
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto hide-scrollbar">
              {items.map(it => (
                <div key={it.id} className="flex justify-between items-center p-4 bg-background-dark/30 rounded-2xl border border-surface-accent">
                  <div>
                    <p className="text-sm font-bold text-white">{it.name}</p>
                    <p className="text-[9px] text-slate-500 uppercase">Cost: ${it.price} | PVP: ${it.cost} | Cant: {it.qty}</p>
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
