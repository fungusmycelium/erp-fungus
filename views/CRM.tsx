
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Customer, ShippingMethod } from '../types';
import { formatRut } from '../lib/utils';
import Pagination from '../components/Pagination';

const mapCustomer = (c: any): Customer => ({
  id: c.id,
  firstName: c.first_name,
  lastName: c.last_name,
  rut: c.rut,
  address: c.address || '',
  commune: c.commune || '',
  region: c.region || '',
  email: c.email || '',
  phone: c.phone || '',
  shippingMethod: c.shipping_method as ShippingMethod,
  sucursalName: c.sucursal_name,
  isSucursalDelivery: c.is_sucursal_delivery,
  isCompany: c.is_company,
  businessName: c.business_name,
  businessGiro: c.business_giro,
  lastOrderNumber: '' // Not fetching this relation for now
});

const REGIONES_CHILE = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
  "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule",
  "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos",
  "Aysén", "Magallanes"
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

const CRM: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) console.error(error);
    else setCustomers(data?.map(mapCustomer) || []);
  };

  useEffect(() => {
    fetchCustomers();
    const channel = supabase.channel('customers_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchCustomers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditForm({ ...customer });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (editForm) {
      const isNew = !editForm.id;
      const customerData = {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        rut: editForm.rut,
        address: editForm.address,
        commune: editForm.commune,
        region: editForm.region,
        email: editForm.email,
        phone: editForm.phone,
        shipping_method: editForm.shippingMethod,
        is_company: editForm.isCompany,
        business_name: editForm.businessName,
        business_giro: editForm.businessGiro,
      };

      let result;
      if (isNew) {
        result = await supabase.from('customers').insert([customerData]);
      } else {
        result = await supabase.from('customers').update(customerData).eq('id', editForm.id);
      }

      if (result.error) {
        console.error(result.error);
        alert('Error al guardar: ' + result.error.message);
      } else {
        setEditingId(null);
        setEditForm(null);
        fetchCustomers(); // Refresh list
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Desea eliminar este registro de la base de datos maestra?')) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) {
        console.error(error);
        alert('Error al eliminar');
      }
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editForm) {
      const { name, value, type } = e.target as any;
      let newValue = type === 'checkbox' ? (e.target as any).checked : value;

      if (name === 'rut') {
        newValue = formatRut(value);
      }

      const updatedForm = {
        ...editForm,
        [name]: newValue
      };

      // Reset commune if region changes
      if (name === 'region') {
        updatedForm.commune = (COMUNAS_POR_REGION[newValue] || [])[0] || '';
      }

      setEditForm(updatedForm);
    }
  };

  const filteredCustomers = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.businessName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rut.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-8 bg-background-dark min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Directorio de Clientes</h1>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Gestión Central de Entidades y Logística</p>
        </div>

        <div className="relative w-full md:w-96">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500">search</span>
          <input
            type="text"
            placeholder="Buscar por RUT, Nombre o Empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-dark border-surface-accent border rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 && !editingId ? (
          <div className="col-span-full text-center py-40 opacity-20">
            <span className="material-icons-round text-8xl block mb-6">people_outline</span>
            <p className="text-xl font-bold uppercase tracking-widest">Base de datos vacía</p>
          </div>
        ) : (
          <>
            {editingId === '' && editForm && (
              <div className="bg-surface-dark rounded-[2.5rem] border border-primary ring-4 ring-primary/10 overflow-hidden">
                <div className="p-8 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">Nuevo Cliente</span>
                    <div className="flex gap-2">
                      <button onClick={handleCancel} className="p-2 bg-background-dark text-slate-500 rounded-xl hover:text-white transition-colors"><span className="material-icons-round text-sm">close</span></button>
                      <button onClick={handleSave} className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-90 transition-all"><span className="material-icons-round text-sm">save</span></button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input type="checkbox" name="isCompany" checked={editForm?.isCompany} onChange={handleFormChange} className="rounded border-surface-accent bg-background-dark text-primary focus:ring-primary" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Es una Empresa?</span>
                      </label>
                    </div>

                    {editForm?.isCompany ? (
                      <>
                        <input name="businessName" value={editForm?.businessName} onChange={handleFormChange} placeholder="Razón Social" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                        <input name="businessGiro" value={editForm?.businessGiro} onChange={handleFormChange} placeholder="Giro Comercial" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input name="firstName" value={editForm?.firstName} onChange={handleFormChange} placeholder="Nombre" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                        <input name="lastName" value={editForm?.lastName} onChange={handleFormChange} placeholder="Apellido" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                      </div>
                    )}
                    <input name="rut" value={editForm?.rut} onChange={handleFormChange} placeholder="RUT" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white font-mono" />
                    <input name="email" value={editForm?.email} onChange={handleFormChange} placeholder="Email" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                    <input name="phone" value={editForm?.phone} onChange={handleFormChange} placeholder="Teléfono" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />

                    <div className="grid grid-cols-2 gap-2">
                      <select name="region" value={editForm?.region} onChange={handleFormChange} className="bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-[10px] text-white">
                        {REGIONES_CHILE.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select name="commune" value={editForm?.commune} onChange={handleFormChange} className="bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-[10px] text-white">
                        {(COMUNAS_POR_REGION[editForm?.region || ''] || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <input name="address" value={editForm?.address} onChange={handleFormChange} placeholder="Dirección" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                  </div>
                </div>
              </div>
            )}
            {paginatedCustomers.map(customer => (
              <div key={customer.id} className={`bg-surface-dark rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${editingId === customer.id ? 'border-primary ring-4 ring-primary/10' : 'border-surface-accent hover:border-primary/40'}`}>
                {editingId === customer.id ? (
                  <div className="p-8 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">Editor de Perfil</span>
                      <div className="flex gap-2">
                        <button onClick={handleCancel} className="p-2 bg-background-dark text-slate-500 rounded-xl hover:text-white transition-colors"><span className="material-icons-round text-sm">close</span></button>
                        <button onClick={handleSave} className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-90 transition-all"><span className="material-icons-round text-sm">save</span></button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer mb-4">
                          <input type="checkbox" name="isCompany" checked={editForm?.isCompany} onChange={handleFormChange} className="rounded border-surface-accent bg-background-dark text-primary focus:ring-primary" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Es una Empresa?</span>
                        </label>
                      </div>

                      {editForm?.isCompany ? (
                        <>
                          <input name="businessName" value={editForm?.businessName} onChange={handleFormChange} placeholder="Razón Social" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                          <input name="businessGiro" value={editForm?.businessGiro} onChange={handleFormChange} placeholder="Giro Comercial" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <input name="firstName" value={editForm?.firstName} onChange={handleFormChange} placeholder="Nombre" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                          <input name="lastName" value={editForm?.lastName} onChange={handleFormChange} placeholder="Apellido" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                        </div>
                      )}
                      <input name="rut" value={editForm?.rut} onChange={handleFormChange} placeholder="RUT" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white font-mono" />
                      <input name="email" value={editForm?.email} onChange={handleFormChange} placeholder="Email" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                      <input name="phone" value={editForm?.phone} onChange={handleFormChange} placeholder="Teléfono" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />

                      <div className="grid grid-cols-2 gap-2">
                        <select name="region" value={editForm?.region} onChange={handleFormChange} className="bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-[10px] text-white">
                          {REGIONES_CHILE.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select name="commune" value={editForm?.commune} onChange={handleFormChange} className="bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-[10px] text-white">
                          {(COMUNAS_POR_REGION[editForm?.region || ''] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <input name="address" value={editForm?.address} onChange={handleFormChange} placeholder="Dirección" className="w-full bg-background-dark border-surface-accent border rounded-xl py-2 px-3 text-xs text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest w-fit ${customer.isCompany ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-slate-800 text-slate-500'}`}>
                          {customer.isCompany ? 'Empresa' : 'Particular'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{customer.rut}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(customer)} className="w-9 h-9 rounded-xl bg-background-dark text-slate-500 flex items-center justify-center hover:text-primary transition-all"><span className="material-icons-round text-sm">edit</span></button>
                        <button onClick={() => handleDelete(customer.id)} className="w-9 h-9 rounded-xl bg-background-dark text-slate-500 flex items-center justify-center hover:text-danger transition-all"><span className="material-icons-round text-sm">delete</span></button>
                      </div>
                    </div>

                    <div className="flex-1 mb-6">
                      <h3 className="text-xl font-black text-white leading-tight mb-4">
                        {customer.isCompany ? customer.businessName : `${customer.firstName} ${customer.lastName}`}
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="material-icons-round text-primary text-sm mt-0.5">place</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-300 truncate">{customer.address}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase">{customer.commune}, {customer.region}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="material-icons-round text-primary text-sm">mail</span>
                          <p className="text-[11px] font-bold text-slate-400 truncate">{customer.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="material-icons-round text-primary text-sm">phone_iphone</span>
                          <p className="text-[11px] font-bold text-slate-400">{customer.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Prefiere</p>
                        <p className="text-[10px] font-black text-success uppercase">{customer.shippingMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Últ. Pedido</p>
                        <p className="text-[10px] font-mono font-bold text-primary">{customer.lastOrderNumber || 'Sin ventas'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="col-span-full mt-10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredCustomers.length}
              />
            </div>
          </>
        )}
      </main>

      <button
        onClick={() => {
          const newCustomer: Customer = {
            id: '',
            firstName: '',
            lastName: '',
            rut: '',
            address: '',
            commune: '',
            region: 'Metropolitana de Santiago',
            email: '',
            phone: '',
            shippingMethod: 'Retiro',
            isCompany: false,
            businessName: '',
            businessGiro: '',
            lastOrderNumber: ''
          };
          setEditForm(newCustomer);
          setEditingId(''); // Use empty string to indicate a new customer in the UI
        }}
        className="fixed bottom-10 right-10 w-16 h-16 bg-success text-white rounded-3xl shadow-2xl shadow-success/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50">
        <span className="material-icons-round text-3xl">add</span>
      </button>
    </div>
  );
};

export default CRM;
