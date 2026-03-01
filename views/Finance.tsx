
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, SaleRecord, PurchaseRecord } from '../types';
import { supabase } from '../lib/supabase';
import { mapInventoryItem, mapSaleRecord, mapPurchaseRecord } from '../lib/mappers';

const Finance: React.FC = () => {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounting'>('dashboard');

  useEffect(() => {
    const fetchData = async () => {
      const { data: invData } = await supabase.from('inventory_items').select('*');
      if (invData) setProducts(invData.map(mapInventoryItem));

      const { data: salesData } = await supabase.from('sales').select('*, items:sale_items(*), customer:customers(*)');
      if (salesData) setSales(salesData.map(mapSaleRecord));

      const { data: purchData } = await supabase.from('purchases').select('*, items:purchase_items(*)');
      if (purchData) setPurchases(purchData.map(mapPurchaseRecord));
    };
    fetchData();
  }, []);

  const financialData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlySales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    });

    const monthlyPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    });

    const totalMonthlySales = monthlySales.reduce((acc, s) => acc + s.total, 0);
    const totalMonthlyPurchases = monthlyPurchases.reduce((acc, p) => acc + p.total, 0);

    const inventoryValuation = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
    const approximateProfit = totalMonthlySales - totalMonthlyPurchases;

    // IVA Calculations
    const ivaSales = sales.reduce((acc, s) => {
      const neto = Math.round(s.total / 1.19);
      return acc + (s.total - neto);
    }, 0);

    const ivaPurchases = purchases.reduce((acc, p) => {
      const neto = Math.round(p.total / 1.19);
      return acc + (p.total - neto);
    }, 0);

    return {
      approximateProfit,
      inventoryValuation,
      ivaSales,
      ivaPurchases,
      totalMonthlySales,
      totalMonthlyPurchases
    };
  }, [products, sales, purchases]);

  return (
    <div className="p-8 h-full bg-background-dark overflow-y-auto">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Análisis Financiero</h1>
          <p className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Métricas de Rentabilidad y Gestión Contable</p>
        </div>
        <div className="flex bg-surface-dark p-1 rounded-2xl border border-surface-accent">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('accounting')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'accounting' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Contabilidad
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 grid grid-cols-3 gap-6 mb-8">
            <div className="bg-surface-dark p-8 rounded-3xl border border-surface-accent shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-icons-round text-6xl">payments</span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ganancia Aproximada (Mes)</p>
              <p className={`text-3xl font-black font-mono ${financialData.approximateProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                ${financialData.approximateProfit.toLocaleString('es-CL')}
              </p>
              <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase">Ventas vs Compras del Mes</p>
            </div>

            <div className="bg-surface-dark p-8 rounded-3xl border border-surface-accent shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-icons-round text-6xl">inventory_2</span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valorización de Inventario</p>
              <p className="text-3xl font-black text-white font-mono">${financialData.inventoryValuation.toLocaleString('es-CL')}</p>
              <p className="text-[9px] text-primary font-bold mt-2 uppercase">Total Capital en Mercadería</p>
            </div>

            <div className="bg-surface-dark p-8 rounded-3xl border border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden group border-2">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <span className="material-icons-round text-4xl text-primary">receipt_long</span>
              </div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Desglose IVA Venta ($90.000)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-white font-mono">$14.370</p>
                <p className="text-[10px] text-slate-500 font-bold">IVA (19%)</p>
              </div>
              <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">Neto: $75.630</p>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-surface-dark p-10 rounded-[3rem] border border-surface-accent shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-icons-round">shopping_cart</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">IVA en Compras</h3>
              </div>
              <p className="text-5xl font-black text-white font-mono mb-4">${financialData.ivaPurchases.toLocaleString('es-CL')}</p>
              <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (financialData.ivaPurchases / (financialData.ivaSales || 1)) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-6 uppercase tracking-widest">Crédito Fiscal Acumulado (Histórico)</p>
            </div>

            <div className="bg-surface-dark p-10 rounded-[3rem] border border-surface-accent shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center text-success">
                  <span className="material-icons-round">sell</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">IVA en Ventas</h3>
              </div>
              <p className="text-5xl font-black text-white font-mono mb-4">${financialData.ivaSales.toLocaleString('es-CL')}</p>
              <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-success"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-6 uppercase tracking-widest">Débito Fiscal Acumulado (Histórico)</p>
            </div>
          </div>

          <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/20">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Resumen Tributario Estimado</h4>
            <div className="flex justify-between items-center bg-background-dark/50 p-6 rounded-2xl border border-white/5">
              <div>
                <p className="text-xs font-black text-white uppercase">Diferencia de IVA (IVA por Pagar/Favor)</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Débito Fiscal - Crédito Fiscal</p>
              </div>
              <p className={`text-2xl font-black font-mono ${financialData.ivaSales - financialData.ivaPurchases >= 0 ? 'text-warning' : 'text-success'}`}>
                ${Math.abs(financialData.ivaSales - financialData.ivaPurchases).toLocaleString('es-CL')}
                <span className="text-[10px] ml-2">{financialData.ivaSales - financialData.ivaPurchases >= 0 ? '(A Pagar)' : '(A Favor)'}</span>
              </p>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default Finance;
