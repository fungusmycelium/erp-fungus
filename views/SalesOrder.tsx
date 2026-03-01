
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SaleRecord, OrderItem, ShippingMethod, Customer, InventoryItem } from '../types';
import { formatRut, validateRut } from '../lib/utils';

const REGIONES_CHILE = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
  "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule",
  "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos",
  "Aysen", "Magallanes"
];

const COMUNAS_POR_REGION: Record<string, string[]> = {
  "Metropolitana de Santiago": ["Santiago", "Providencia", "Las Condes", "Ñuñoa", "Maipú", "Puente Alto", "La Florida", "San Bernardo"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "Concón", "Quillota"],
  "Ñuble": ["Chillán", "San Carlos", "Coihueco", "Bulnes"],
  "Biobío": ["Concepción", "Talcahuano", "Chiguayante", "San Pedro de la Paz", "Coronel", "Lota"],
  "Araucanía": ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol"],
  "Los Ríos": ["Valdivia", "La Unión", "Río Bueno"],
  "Los Lagos": ["Puerto Montt", "Osorno", "Castro", "Puerto Varas"],
  "Aysén": ["Coyhaique", "Puerto Aysén"],
  "Magallanes": ["Punta Arenas", "Puerto Natales"]
};

// Moved validateRut to ../lib/utils.ts

interface Props {
  onBack: () => void;
}

const SalesOrder: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [correlative, setCorrelative] = useState(() => 'COT-' + Math.floor(1000 + Math.random() * 9000));
  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem('fungus_company_logo'));
  const quoteFileRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<Customer>({
    id: Math.random().toString(36).substr(2, 9),
    firstName: '',
    lastName: '',
    rut: '',
    address: '',
    commune: '',
    region: 'Metropolitana de Santiago',
    email: '',
    phone: '',
    shippingMethod: 'Retiro',
    isSucursalDelivery: false,
    sucursalName: '',
    isCompany: false,
    businessName: '',
    businessGiro: '',
  });

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [orderLines, setOrderLines] = useState<OrderItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [matchingStandardProducts, setMatchingStandardProducts] = useState<any[]>([]);
  const [showProductAutocompleteId, setShowProductAutocompleteId] = useState<string | null>(null);

  const searchCustomer = async (rut: string) => {
    const cleanRut = rut.replace(/\./g, '').replace('-', '');
    if (cleanRut.length < 3) {
      setMatchingCustomers([]);
      setShowAutocomplete(false);
      return;
    }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('rut', `%${rut}%`)
      .limit(5);

    if (data) {
      setMatchingCustomers(data.map(c => ({
        id: c.id,
        firstName: c.first_name || '',
        lastName: c.last_name || '',
        rut: c.rut,
        address: c.address || '',
        commune: c.commune || '',
        region: c.region || 'Metropolitana de Santiago',
        email: c.email || '',
        phone: c.phone || '',
        shippingMethod: (c.shipping_method as ShippingMethod) || 'Retiro',
        isSucursalDelivery: c.is_sucursal_delivery || false,
        sucursalName: c.sucursal_name || '',
        isCompany: c.is_company || false,
        businessName: c.business_name || '',
        businessGiro: c.business_giro || '',
      })));
      setShowAutocomplete(data.length > 0);
    } else {
      setMatchingCustomers([]);
      setShowAutocomplete(false);
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomer(c);
    setMatchingCustomers([]);
    setShowAutocomplete(false);
  };

  const searchStandardProduct = async (name: string | undefined) => {
    // 1. Local Search in Inventory
    const localMatches = inventory
      .filter(i => !name || i.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        default_price: i.lastPrice,
        is_inventory: true,
        stock: i.stock
      }));

    if (!name || name.length < 2) {
      setMatchingStandardProducts(localMatches);
      return;
    }

    // 2. Database Search in Standard Products
    const { data } = await supabase
      .from('standard_products')
      .select('*')
      .eq('type', 'sale')
      .ilike('name', `%${name}%`)
      .limit(5);

    const dbMatches = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      default_price: p.default_price,
      is_inventory: false
    }));

    // 3. Combine results (avoid duplicates by name)
    const combined = [...localMatches];
    dbMatches.forEach(dbItem => {
      if (!combined.find(c => c.name.toLowerCase() === dbItem.name.toLowerCase())) {
        combined.push(dbItem);
      }
    });

    setMatchingStandardProducts(combined.slice(0, 8));
  };

  const selectStandardProductForLine = (lineId: string, p: any) => {
    // Check if it exists in inventory to get actual stock/price
    const invItem = inventory.find(i => i.name.toLowerCase() === p.name.toLowerCase());

    updateOrderLine(lineId, 'name', p.name.toUpperCase());
    if (invItem) {
      updateOrderLine(lineId, 'price', invItem.lastPrice);
    } else {
      updateOrderLine(lineId, 'price', Number(p.default_price) || 0);
    }
    setShowProductAutocompleteId(null);
  };

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const addOrderLine = () => {
    setOrderLines([...orderLines, { id: Math.random().toString(36).substr(2, 9), name: '', price: 0, qty: 1 }]);
  };

  const updateOrderLine = (id: string, field: keyof OrderItem, value: any) => {
    setOrderLines(orderLines.map(line => {
      if (line.id === id) {
        let updatedLine = { ...line, [field]: value };
        if (field === 'name') {
          const p = inventory.find(x => x.name === value);
          if (p) updatedLine.price = p.lastPrice;
        }
        return updatedLine;
      }
      return line;
    }));
  };

  const total = orderLines.reduce((acc, line) => acc + (line.price * line.qty), 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  const isStep1Valid = () => {
    const nameValid = customer.isCompany ? !!customer.businessName : (!!customer.firstName && !!customer.lastName);
    const rutValid = validateRut(customer.rut);
    const contactValid = !!customer.email && !!customer.phone;
    const logisticsValid = !!customer.address && !!customer.region;
    return nameValid && rutValid && contactValid && logisticsValid;
  };

  const isStep2Valid = () => {
    return orderLines.length > 0 && orderLines.every(l => !!l.name && l.qty > 0 && l.price > 0);
  };

  const handleNext = () => {
    if (step === 1 && !isStep1Valid()) {
      alert("Todos los campos marcados son obligatorios y el RUT debe ser válido (12345678-9).");
      return;
    }
    if (step === 2 && !isStep2Valid()) {
      alert("Debe agregar al menos un producto con cantidad y precio válido.");
      return;
    }
    setStep(step + 1);
  };

  const handleFinalize = async () => {
    let finalizedShipping = customer.shippingMethod;
    if (['Starken', 'Chilexpress', 'Bluexpress'].includes(customer.shippingMethod)) {
      finalizedShipping = customer.sucursalName ? `${customer.shippingMethod} (Sucursal)` : `${customer.shippingMethod} (A Domicilio)` as any;
    }

    // 1. Ensure Customer exists and get ID
    let customerId: string;
    const { data: existingCust } = await supabase.from('customers').select('id').eq('rut', customer.rut).maybeSingle();

    const customerPayload = {
      first_name: customer.firstName,
      last_name: customer.lastName,
      rut: customer.rut,
      address: customer.address,
      commune: customer.commune,
      region: customer.region,
      email: customer.email,
      phone: customer.phone,
      shipping_method: finalizedShipping,
      is_company: customer.isCompany,
      business_name: customer.businessName,
      business_giro: customer.businessGiro,
      sucursal_name: customer.sucursalName,
    };

    if (existingCust) {
      customerId = existingCust.id;
      await supabase.from('customers').update(customerPayload).eq('id', customerId);
    } else {
      const { data: newCust, error: cErr } = await supabase.from('customers').insert([customerPayload]).select().single();
      if (cErr) { alert('Error creando cliente'); return; }
      customerId = newCust.id;
    }

    // 2. Create Sale
    const { data: newSale, error: sErr } = await supabase.from('sales').insert([{
      order_number: correlative,
      customer_id: customerId,
      total: total,
      date: saleDate,
      status: 'Completado'
    }]).select().single();

    if (sErr) { alert('Error creando venta'); return; }

    // 3. Create Sale Items and Update Inventory
    for (const line of orderLines) {
      const invItem = inventory.find(i => i.name === line.name);
      await supabase.from('sale_items').insert({
        sale_id: newSale.id,
        inventory_item_id: invItem?.id,
        item_name: line.name,
        qty: line.qty,
        price: line.price,
        cost: invItem?.cost
      });

      if (invItem) {
        await supabase.from('inventory_items').update({
          stock: invItem.stock - line.qty
        }).eq('id', invItem.id);
      }
    }

    alert('¡Venta guardada exitosamente en la base de datos!');
    onBack();
  };

  return (
    <div className="relative flex flex-col h-screen bg-background-dark overflow-hidden print:bg-white print:text-black">
      <header className="pt-12 px-8 pb-6 bg-background-dark/95 border-b border-surface-accent print:hidden">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-surface-dark text-slate-400 rounded-xl hover:text-white transition-all transition-colors print:hidden"><span className="material-icons-round">arrow_back</span></button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight print:hidden">Nueva Cotización</h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest print:hidden">Paso {step} de 3 • Fungus Mycelium Ltda</p>
            </div>
          </div>
          {step === 3 && (
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-primary text-white font-black rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 transition-all print:hidden"
            >
              <span className="material-icons-round text-sm">download</span>
              Descargar PDF
            </button>
          )}
        </div>

        <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`flex flex-col items-center gap-2 ${step < s ? 'opacity-30' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${step === s ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' : step > s ? 'bg-success text-white' : 'bg-surface-accent text-slate-400'}`}>
                  {step > s ? <span className="material-icons-round text-sm">check</span> : s}
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider">{s === 1 ? 'Cliente' : s === 2 ? 'Pedido' : 'Finalizar'}</span>
              </div>
              {s < 3 && <div className={`flex-1 h-[2px] mx-4 -mt-8 ${step > s ? 'bg-success' : 'bg-surface-accent'}`}></div>}
            </React.Fragment>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pt-8 pb-40 hide-scrollbar print:p-0 print:overflow-visible">
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-8">
              <section className="bg-surface-dark/40 p-8 rounded-[2rem] border border-surface-accent space-y-6 shadow-xl">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-3 mb-2">Información del Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2 relative">
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">RUT *</label>
                    <input
                      value={customer.rut}
                      onChange={e => {
                        const val = formatRut(e.target.value);
                        setCustomer({ ...customer, rut: val });
                        searchCustomer(val);
                      }}
                      onFocus={() => {
                        if (matchingCustomers.length > 0) setShowAutocomplete(true);
                      }}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm"
                      placeholder="12345678-9"
                    />
                    {showAutocomplete && (
                      <div className="absolute z-50 w-full mt-1 bg-surface-dark border border-surface-accent rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {matchingCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-4 py-3 hover:bg-primary/20 border-b border-white/5 last:border-0 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-white">{c.isCompany ? c.businessName : `${c.firstName} ${c.lastName}`}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{c.rut}</p>
                              </div>
                              <span className="material-icons-round text-primary text-sm">arrow_forward</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Para cerrar al hacer click fuera */}
                    {showAutocomplete && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowAutocomplete(false)}></div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Fecha de Venta *</label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={e => setSaleDate(e.target.value)}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm"
                    />
                  </div>
                  {customer.isCompany ? (
                    <div className="col-span-2 space-y-4">
                      <input value={customer.businessName} onChange={e => setCustomer({ ...customer, businessName: e.target.value })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Razón Social *" />
                    </div>
                  ) : (
                    <>
                      <input value={customer.firstName} onChange={e => setCustomer({ ...customer, firstName: e.target.value })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Nombre *" />
                      <input value={customer.lastName} onChange={e => setCustomer({ ...customer, lastName: e.target.value })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Apellido *" />
                    </>
                  )}
                  <input value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="col-span-2 w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Correo Electrónico *" />
                  <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="col-span-2 w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Celular (+569...) *" />
                </div>
              </section>

              <section className="bg-surface-dark/40 p-8 rounded-[2.5rem] border border-surface-accent space-y-6 shadow-xl">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-3 mb-2">Logística y Despacho</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={customer.region}
                      onChange={e => {
                        const newReg = e.target.value;
                        setCustomer({
                          ...customer,
                          region: newReg,
                          commune: (COMUNAS_POR_REGION[newReg] || [])[0] || ''
                        });
                      }}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm"
                    >
                      {REGIONES_CHILE.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={customer.commune}
                      onChange={e => setCustomer({ ...customer, commune: e.target.value })}
                      className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm"
                    >
                      {(COMUNAS_POR_REGION[customer.region || ''] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm" placeholder="Dirección Solo si va a domicilio *" />

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">Courier</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                      {['Starken', 'Chilexpress', 'Bluexpress', 'Retiro', 'Sucursal'].map(m => (
                        <button
                          key={m}
                          onClick={() => setCustomer({ ...customer, shippingMethod: m as ShippingMethod })}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black border transition-all shrink-0 ${customer.shippingMethod === m ? 'bg-primary border-primary text-white shadow-lg' : 'bg-background-dark border-surface-accent text-slate-500'}`}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    value={customer.sucursalName}
                    onChange={e => setCustomer({ ...customer, sucursalName: e.target.value })}
                    className="w-full bg-background-dark border-primary/30 border rounded-xl py-3 px-4 text-white text-sm"
                    placeholder="Nombre Agencia (Si aplica)"
                  />
                </div>
              </section>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center px-6 py-4 bg-primary/10 border border-primary/20 rounded-3xl shadow-lg">
              <div>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">Selección de Productos</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Pre-Total Bruto</p>
                <p className="text-2xl font-black text-white font-mono tracking-tighter">${total.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {orderLines.map(line => (
                <div key={line.id} className="bg-surface-dark p-6 rounded-[2.5rem] border border-surface-accent grid grid-cols-12 gap-6 items-center group shadow-xl">
                  <div className="col-span-6 relative">
                    <input
                      value={line.name}
                      onChange={(e) => {
                        updateOrderLine(line.id, 'name', e.target.value);
                        searchStandardProduct(e.target.value);
                        setShowProductAutocompleteId(line.id);
                      }}
                      onFocus={() => {
                        searchStandardProduct(line.name);
                        setShowProductAutocompleteId(line.id);
                      }}
                      className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary uppercase"
                      placeholder="Nombre del Producto..."
                    />
                    {showProductAutocompleteId === line.id && matchingStandardProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-surface-dark border border-surface-accent rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {matchingStandardProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => selectStandardProductForLine(line.id, p)}
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
                                {p.is_inventory ? (
                                  <>
                                    <p className={`text-[10px] font-black uppercase ${p.stock <= 3 ? 'text-danger' : 'text-success'}`}>{p.stock} DISP.</p>
                                    <p className="text-xs font-black text-white font-mono tracking-tighter">${Number(p.default_price).toLocaleString('es-CL')}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[10px] text-slate-500 uppercase">Precio Sug.</p>
                                    <p className="text-xs font-black text-white font-mono tracking-tighter">${Number(p.default_price).toLocaleString('es-CL')}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showProductAutocompleteId === line.id && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowProductAutocompleteId(null)}></div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={line.qty} onChange={e => updateOrderLine(line.id, 'qty', parseInt(e.target.value) || 0)} className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-sm text-white text-center font-mono" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={line.price} onChange={e => updateOrderLine(line.id, 'price', parseInt(e.target.value) || 0)} className="w-full bg-background-dark border-surface-accent border rounded-2xl py-3 px-4 text-sm text-white text-right font-mono" />
                  </div>
                  <button onClick={() => setOrderLines(orderLines.filter(l => l.id !== line.id))} className="col-span-1 text-danger hover:scale-125 transition-transform"><span className="material-icons-round">delete</span></button>
                </div>
              ))}
              <button onClick={addOrderLine} className="w-full py-10 border-2 border-dashed border-surface-accent rounded-[3rem] text-slate-500 font-black hover:bg-primary/5 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-2">
                <span className="material-icons-round text-3xl">add_circle</span>
                <span className="text-[10px] tracking-[0.3em] uppercase">Añadir otro producto al pedido</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-4xl mx-auto print:max-w-none animate-in zoom-in-95 print:mt-0 print:pt-0">
            <div className="bg-white text-black p-12 rounded-[3rem] shadow-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:rounded-none relative group/quote">

              {/* Botón flotante para cambiar logo en cotización */}
              <button
                onClick={() => quoteFileRef.current?.click()}
                className="absolute top-4 left-4 p-2 bg-slate-100 rounded-lg text-slate-400 opacity-0 group-hover/quote:opacity-100 transition-opacity print:hidden hover:bg-primary hover:text-white"
                title="Cambiar Logo de Empresa"
              >
                <span className="material-icons-round text-sm">photo_camera</span>
              </button>
              <input type="file" ref={quoteFileRef} className="hidden" accept="image/*" onChange={handleLogoChange} />

              <div className="flex justify-between items-start border-b-2 border-primary/20 pb-8 mb-10">
                <div className="flex gap-6">
                  <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="material-icons-round text-6xl text-slate-300">image</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-black leading-none mb-1">Fungus Mycelium Ltda</h2>
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">RUT: 77.692.324-9</p>
                    <p className="text-[10px] text-primary font-black">Fumycelium@gmail.com</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Santiago de Chile • {new Date().toLocaleDateString('es-CL')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-black text-primary uppercase tracking-tighter leading-none mb-1">Cotización</h1>
                  <div className="mt-2 text-2xl font-black text-black">{correlative}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 text-black">Información del Cliente</h3>
                  <div className="space-y-3">
                    <p className="text-sm font-black text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">Nombre:</span> {customer.isCompany ? customer.businessName : `${customer.firstName} ${customer.lastName}`}</p>
                    <p className="text-sm font-mono font-bold text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">RUT:</span> {customer.rut}</p>
                    <p className="text-sm font-bold text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">Email:</span> {customer.email}</p>
                    <p className="text-sm font-bold text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">Celular:</span> {customer.phone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 text-black">Logística & Despacho</h3>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">Dirección:</span> {customer.address}</p>
                    <p className="text-sm font-bold text-black"><span className="text-[9px] text-slate-500 mr-2 uppercase tracking-widest">Ubicación:</span> {customer.commune}, {customer.region}</p>
                    <p className="text-sm font-bold text-primary uppercase tracking-widest"><span className="text-[9px] text-slate-500 mr-2 uppercase text-black">Courier:</span> {customer.shippingMethod} {customer.sucursalName ? `(${customer.sucursalName})` : ''}</p>
                  </div>
                </div>
              </div>

              <table className="w-full text-left mb-12 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">Descripción</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">Cant.</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right">Unitario</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderLines.map(l => (
                    <tr key={l.id} className="text-black">
                      <td className="p-5 font-bold text-sm">{l.name}</td>
                      <td className="p-5 text-center font-mono text-sm font-bold">{l.qty}</td>
                      <td className="p-5 text-right font-mono text-sm font-bold">${l.price.toLocaleString('es-CL')}</td>
                      <td className="p-5 text-right font-black font-mono text-black">${(l.price * l.qty).toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-10 border-t-4 border-slate-50">
                <div className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                  <p className="mb-2 text-primary font-black">* DOCUMENTO VALIDO SOLO POR 30 DIAS DESDE SU EMISION.</p>
                  <p className="text-black mt-10 text-lg">Italo Tavonatti</p>
                  <p className="text-primary tracking-[0.2em] font-black uppercase">CEO & FOUNDER</p>
                </div>
                <div className="w-80 space-y-4">
                  <div className="flex justify-between items-center text-slate-600 text-xs font-black uppercase tracking-widest px-4">
                    <span>Neto</span>
                    <span className="font-mono text-sm font-bold text-black">${neto.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 text-xs font-black uppercase tracking-widest px-4">
                    <span>IVA (19%)</span>
                    <span className="font-mono text-sm font-bold text-black">${iva.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-primary rounded-[2rem] text-white shadow-xl">
                    <span className="text-sm font-black uppercase tracking-widest">Total Bruto</span>
                    <span className="text-3xl font-black font-mono tracking-tighter">${total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-8 border-t border-slate-100 text-[10px] text-slate-400 italic text-center uppercase tracking-widest font-bold">
                <p>TODOS LOS DERECHOS RESERVADOS A FUNGUS MYCELIUM COMPANY LTDA.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-8 bg-background-dark/95 border-t border-surface-accent z-50 print:hidden">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="flex-1 py-4 bg-surface-dark text-slate-400 font-black rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs">Atrás</button>

          <button
            onClick={() => step < 3 ? handleNext() : handleFinalize()}
            className={`flex-[2] py-4 font-black rounded-2xl transition-all uppercase tracking-[0.2em] text-xs shadow-xl ${(step === 1 && !isStep1Valid()) || (step === 2 && !isStep2Valid()) ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50' : 'bg-primary text-white shadow-primary/30 hover:scale-[1.02]'
              }`}
          >
            {step === 3 ? 'Confirmar y Guardar' : 'Siguiente Paso'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default SalesOrder;
