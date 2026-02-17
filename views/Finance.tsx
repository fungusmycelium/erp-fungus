
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem } from '../types';

import { supabase } from '../lib/supabase';
import { mapInventoryItem } from '../lib/mappers';

const Finance: React.FC = () => {
  const [products, setProducts] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('inventory_items').select('*');
      if (data) setProducts(data.map(mapInventoryItem));
    };
    fetch();
  }, []);

  const totals = useMemo(() => {
    return products.reduce((acc, p) => {
      const unitProfit = p.lastPrice - (p.cost * 1.19);
      const totalPotentialProfit = unitProfit * p.stock;
      return {
        totalPotentialProfit: acc.totalPotentialProfit + totalPotentialProfit,
        avgMargin: acc.avgMargin + (unitProfit / p.lastPrice)
      };
    }, { totalPotentialProfit: 0, avgMargin: 0 });
  }, [products]);

  return (
    <div className="p-8 h-full bg-background-dark overflow-y-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tight">Análisis Financiero</h1>
        <p className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Métricas de Rentabilidad y Escenarios de Cierre</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 grid grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-dark p-8 rounded-3xl border border-surface-accent">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Utilidad Potencial Bruta</p>
            <p className="text-3xl font-black text-white font-mono">${totals.totalPotentialProfit.toLocaleString('es-CL')}</p>
            <p className="text-[9px] text-primary font-bold mt-2 uppercase">Basado en Stock Activo</p>
          </div>
          <div className="bg-surface-dark p-8 rounded-3xl border border-surface-accent">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Margen Promedio</p>
            <p className="text-3xl font-black text-white font-mono">{((totals.avgMargin / (products.length || 1)) * 100).toFixed(1)}%</p>
            <p className="text-[9px] text-success font-bold mt-2 uppercase">Retorno sobre Venta</p>
          </div>
          <div className="bg-surface-dark p-8 rounded-3xl border border-surface-accent">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Punto de Equilibrio</p>
            <p className="text-3xl font-black text-white font-mono">${Math.round(totals.totalPotentialProfit * 0.4).toLocaleString('es-CL')}</p>
            <p className="text-[9px] text-warning font-bold mt-2 uppercase">Estimación de Costos Fijos</p>
          </div>
        </section>

        <section className="col-span-12 bg-surface-dark/40 rounded-[3rem] border border-surface-accent overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-surface-dark border-b border-surface-accent">
              <tr className="text-[10px] font-black text-slate-500 uppercase">
                <th className="p-6">Producto</th>
                <th className="p-6 text-right">Costo Neto</th>
                <th className="p-6 text-right">IVA (19%)</th>
                <th className="p-6 text-right text-primary">Precio Venta (IVA INC)</th>
                <th className="p-6 text-right text-success">Ganancia (U)</th>
                <th className="p-6 text-right">Rentabilidad %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-accent">
              {products.map(p => {
                const iva = p.cost * 0.19;
                const profit = p.lastPrice - (p.cost + iva);
                const margin = (profit / p.lastPrice) * 100;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-all">
                    <td className="p-6 font-bold text-white">{p.name}</td>
                    <td className="p-6 text-right font-mono">${p.cost.toLocaleString('es-CL')}</td>
                    <td className="p-6 text-right font-mono text-slate-500">${Math.round(iva).toLocaleString('es-CL')}</td>
                    <td className="p-6 text-right font-mono font-black text-primary">${p.lastPrice.toLocaleString('es-CL')}</td>
                    <td className="p-6 text-right font-mono font-black text-success">${Math.round(profit).toLocaleString('es-CL')}</td>
                    <td className="p-6 text-right font-mono font-bold text-success">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default Finance;
