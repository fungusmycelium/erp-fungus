
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SaleRecord, OrderItem, Customer } from '../types';

const mapSaleRecord = (s: any): SaleRecord => ({
  id: s.id,
  orderNumber: s.order_number,
  customerName: s.customer ? (s.customer.is_company ? s.customer.business_name : `${s.customer.first_name} ${s.customer.last_name}`) : 'Cliente Desconocido',
  date: new Date(s.date).toLocaleDateString('es-CL'),
  total: Number(s.total),
  status: s.status,
  items: s.items?.map((i: any) => ({
    id: i.id,
    name: i.item_name,
    qty: i.qty,
    price: Number(i.price),
    cost: Number(i.cost)
  })) || [],
  customerDetails: s.customer ? {
    id: s.customer.id,
    firstName: s.customer.first_name,
    lastName: s.customer.last_name,
    rut: s.customer.rut,
    address: s.customer.address,
    commune: s.customer.commune,
    region: s.customer.region,
    email: s.customer.email,
    phone: s.customer.phone,
    shippingMethod: s.customer.shipping_method,
    sucursalName: s.customer.sucursal_name,
    isSucursalDelivery: s.customer.is_sucursal_delivery,
    isCompany: s.customer.is_company,
    businessName: s.customer.business_name,
    businessGiro: s.customer.business_giro
  } : {} as Customer
});

interface Props {
  onNew: () => void;
}

const SalesList: React.FC<Props> = ({ onNew }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SaleRecord | null>(null);
  const [search, setSearch] = useState('');
  const [logoUrl] = useState<string | null>(() => localStorage.getItem('fungus_company_logo'));

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        items:sale_items(*)
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
    } else {
      setSales(data?.map(mapSaleRecord) || []);
    }
  };

  useEffect(() => {
    fetchSales();

    const channel = supabase
      .channel('sales_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta venta permanentemente?')) {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar venta');
        console.error(error);
      } else {
        // Realtime will update list, but we can optimistically update too
        setSales(sales.filter(s => s.id !== id));
      }
    }
  };

  const handleSave = async () => {
    if (editForm) {
      // For now only allowing update of header fields (orderNumber)
      // Updating items or customer deep details would require more complex logic
      const { error } = await supabase
        .from('sales')
        .update({
          order_number: editForm.orderNumber
          // Add other fields if editable in UI
        })
        .eq('id', editForm.id);

      if (error) {
        console.error('Error updating sale:', error);
        alert('Error al guardar cambios');
      } else {
        setSales(sales.map(s => s.id === editForm.id ? editForm : s));
        setEditingId(null);
      }
    }
  };

  const filteredSales = sales.filter(s =>
    s.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSale = sales.find(s => s.id === viewingId);

  return (
    <div className="pb-32 bg-background-dark min-h-screen">
      <header className="sticky top-0 z-40 bg-background-dark/90 ios-blur px-6 pt-12 pb-4 border-b border-surface-accent">
        <h1 className="text-2xl font-bold tracking-tight text-white">Historial de Ventas</h1>
        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Cotizaciones Emitidas & Facturación</p>

        <div className="mt-4 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-500 text-sm">search</span>
          <input
            type="text"
            placeholder="Buscar por folio o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-dark border-surface-accent border rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </header>

      <main className="px-5 py-6 space-y-4">
        {filteredSales.map(sale => (
          <div key={sale.id} className={`bg-surface-dark/40 border rounded-2xl transition-all ${editingId === sale.id ? 'border-primary ring-1 ring-primary/20 p-5' : 'border-surface-accent p-4'}`}>
            {editingId === sale.id ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-primary uppercase">Editor de Registro</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-800 text-slate-400 rounded-lg"><span className="material-icons-round text-sm">close</span></button>
                    <button onClick={handleSave} className="p-2 bg-success text-white rounded-lg shadow-lg"><span className="material-icons-round text-sm">save</span></button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <input value={editForm?.orderNumber} onChange={e => setEditForm(f => f ? { ...f, orderNumber: e.target.value } : null)} className="w-full bg-surface-dark border-surface-accent border rounded-lg py-2 px-3 text-xs text-white" />
                  <input value={editForm?.customerName} onChange={e => setEditForm(f => f ? { ...f, customerName: e.target.value } : null)} className="w-full bg-surface-dark border-surface-accent border rounded-lg py-2 px-3 text-xs text-white" />
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{sale.orderNumber}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{sale.date}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{sale.customerName}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-black text-white font-mono">${sale.total.toLocaleString('es-CL')}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setViewingId(sale.id)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"><span className="material-icons-round text-sm">visibility</span></button>
                    <button onClick={() => handleDelete(sale.id)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:text-danger transition-colors"><span className="material-icons-round text-sm">delete</span></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Modal Visualizador de Cotización */}
      {viewingId && selectedSale && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[3rem] overflow-y-auto p-12 relative text-black shadow-2xl">
            <button onClick={() => setViewingId(null)} className="absolute top-8 right-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all text-slate-500 print:hidden">
              <span className="material-icons-round">close</span>
            </button>

            <div className="flex justify-between items-start border-b-2 border-primary/20 pb-8 mb-10">
              <div className="flex gap-6">
                <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="material-icons-round text-5xl text-slate-300">image</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black tracking-tighter leading-none mb-1">Fungus Mycelium Ltda</h2>
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">RUT: 77.692.324-9</p>
                  <p className="text-[10px] text-primary font-black">Fumycelium@gmail.com</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedSale.date}</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-black text-primary uppercase tracking-tighter leading-none mb-1">Cotización</h1>
                <p className="text-xl font-mono font-black text-black">{selectedSale.orderNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h3 className="text-[9px] font-black text-primary uppercase mb-6 tracking-widest text-black">Información del Cliente</h3>
                <div className="space-y-2">
                  <p className="font-black text-sm text-black">{selectedSale.customerDetails.isCompany ? selectedSale.customerDetails.businessName : `${selectedSale.customerDetails.firstName} ${selectedSale.customerDetails.lastName}`}</p>
                  <p className="text-xs font-mono font-bold text-slate-900">{selectedSale.customerDetails.rut}</p>
                  <p className="text-xs text-slate-700 mt-1">{selectedSale.customerDetails.email}</p>
                  <p className="text-xs text-slate-700 font-bold">{selectedSale.customerDetails.phone}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h3 className="text-[9px] font-black text-primary uppercase mb-6 tracking-widest text-black">Logística & Despacho</h3>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-black">{selectedSale.customerDetails.address}</p>
                  <p className="text-[10px] text-slate-700 font-bold uppercase">{selectedSale.customerDetails.commune}, {selectedSale.customerDetails.region}</p>
                  <p className="text-xs font-black text-primary uppercase mt-4 tracking-widest">{selectedSale.customerDetails.shippingMethod} {selectedSale.customerDetails.sucursalName ? `(${selectedSale.customerDetails.sucursalName})` : ''}</p>
                </div>
              </div>
            </div>

            <table className="w-full text-left mb-10 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-widest">
                  <th className="p-5 rounded-l-2xl">Descripción</th>
                  <th className="p-5 text-center">Cant</th>
                  <th className="p-5 text-right">Unitario</th>
                  <th className="p-5 text-right rounded-r-2xl">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSale.items.map(l => (
                  <tr key={l.id} className="text-sm text-black">
                    <td className="p-5 font-bold">{l.name}</td>
                    <td className="p-5 text-center font-mono font-bold">{l.qty}</td>
                    <td className="p-5 text-right font-mono font-bold">${l.price.toLocaleString('es-CL')}</td>
                    <td className="p-5 text-right font-black font-mono text-black">${(l.price * l.qty).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-10 border-t-2 border-slate-50">
              <div className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                <p className="mb-2 text-primary font-black tracking-widest">* DOCUMENTO VALIDO SOLO POR 30 DIAS DESDE SU EMISION.</p>
                <p className="text-black mt-10 text-lg font-black uppercase">Italo Tavonatti</p>
                <p className="text-primary tracking-[0.3em] font-black">CEO & FOUNDER</p>
              </div>
              <div className="w-80 space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-4">
                  <span>Subtotal Neto</span>
                  <span className="text-black font-mono">${Math.round(selectedSale.total / 1.19).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-4">
                  <span>IVA (19%)</span>
                  <span className="text-black font-mono">${Math.round(selectedSale.total - (selectedSale.total / 1.19)).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center p-8 bg-primary rounded-[2rem] text-white shadow-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Bruto</span>
                  <span className="text-3xl font-black font-mono tracking-tighter">${selectedSale.total.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-slate-100 text-[10px] text-slate-400 italic text-center uppercase tracking-[0.2em] font-bold">
              <p>TODOS LOS DERECHOS RESERVADOS A FUNGUS MYCELIUM COMPANY LTDA.</p>
            </div>

            <button onClick={() => window.print()} className="mt-12 w-full py-5 bg-black text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-slate-900 transition-all print:hidden uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95">
              <span className="material-icons-round text-base">print</span> IMPRIMIR / DESCARGAR PDF
            </button>
          </div>
        </div>
      )}

      <button onClick={onNew} className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-white rounded-3xl shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform z-50">
        <span className="material-icons-round text-3xl">add_shopping_cart</span>
      </button>
    </div>
  );
};

export default SalesList;
