
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
// Fix: added Type to import for structured JSON output config
import { GoogleGenAI, Type } from "@google/genai";
import { SaleRecord, PurchaseRecord, InventoryItem } from '../types';

import { supabase } from '../lib/supabase';
import { mapSaleRecord, mapPurchaseRecord, mapInventoryItem } from '../lib/mappers';

const Dashboard: React.FC<{ onNewSale: () => void }> = ({ onNewSale }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [projectionPeriod, setProjectionPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('1m');
  const [isProjecting, setIsProjecting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: sData } = await supabase.from('sales').select('*, items:sale_items(*), customer:customers(*)');
      const { data: pData } = await supabase.from('purchases').select('*, items:purchase_items(*)');
      const { data: iData } = await supabase.from('inventory_items').select('*');

      if (sData) setSales(sData.map(mapSaleRecord));
      if (pData) setPurchases(pData.map(mapPurchaseRecord));
      if (iData) setInventory(iData.map(mapInventoryItem));
    };

    fetchData();

    // Optional: Add realtime if critical, but dashboard usually can pull on mount
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toLocaleDateString('es-CL');

    const monthlySales = sales.filter(s => {
      const parts = s.date.split('/');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      return false;
    });

    const dailySalesTotal = sales.filter(s => s.date === todayStr)
      .reduce((acc, curr) => acc + curr.total, 0);

    const monthlyPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSales = monthlySales.reduce((acc, curr) => acc + curr.total, 0);
    const totalPurchases = monthlyPurchases.reduce((acc, curr) => acc + curr.total, 0);
    const profit = totalSales - totalPurchases;
    const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
    const inventoryValue = inventory.reduce((acc, curr) => acc + (curr.stock * curr.lastPrice), 0);

    // Calcular producto más vendido
    const productCounts: Record<string, number> = {};
    monthlySales.forEach(sale => {
      sale.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.qty;
      });
    });
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { totalSales, dailySalesTotal, totalPurchases, profit, margin, inventoryValue, topProduct };
  }, [sales, purchases, inventory]);

  const generateProjection = async () => {
    setIsProjecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const history = sales.map(s => ({ date: s.date, total: s.total }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Basado en este historial de ventas: ${JSON.stringify(history)}. 
        Genera una proyección de ventas mensuales para los próximos ${projectionPeriod === '1m' ? '1 mes' : projectionPeriod === '3m' ? '3 meses' : projectionPeriod === '6m' ? '6 meses' : '12 meses'}.
        Incluye los últimos 3 meses reales para contexto.`,
        config: {
          responseMimeType: "application/json",
          // Fix: provided responseSchema for more reliable JSON parsing
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Mes y Año de la proyección' },
                ventas: { type: Type.NUMBER, description: 'Valor de ventas reales (si corresponde)' },
                proyeccion: { type: Type.NUMBER, description: 'Valor de ventas proyectadas' },
              },
              propertyOrdering: ["name", "ventas", "proyeccion"]
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setProjectionData(data);
    } catch (error) {
      console.error("AI Projection error:", error);
      setProjectionData([
        { name: 'MES-1', ventas: stats.totalSales, proyeccion: stats.totalSales * 1.1 },
        { name: 'MES-2', proyeccion: stats.totalSales * 1.2 },
        { name: 'MES-3', proyeccion: stats.totalSales * 1.15 },
      ]);
    } finally {
      setIsProjecting(false);
    }
  };

  useEffect(() => {
    generateProjection();
  }, [projectionPeriod, sales]);

  return (
    <div className="p-8 h-full bg-background-dark overflow-y-auto hide-scrollbar pb-32">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter leading-none">Fungus Executive Control</h1>
          <p className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mt-3">SISTEMA DE GESTIÓN CORPORATIVA • FUNGUS MYCELIUM LTDA</p>
        </div>
        <button onClick={onNewSale} className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
          <span className="material-icons-round">add_shopping_cart</span> NUEVA COTIZACIÓN
        </button>
      </header>

      <main className="grid grid-cols-12 gap-8">
        <section className="col-span-12 grid grid-cols-4 gap-6">
          <div className="bg-surface-dark p-8 rounded-[2rem] border border-surface-accent shadow-xl group hover:border-primary/40 transition-all">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Facturación Mensual</p>
            <p className="text-3xl font-black text-white font-mono">${stats.totalSales.toLocaleString('es-CL')}</p>
            <p className="text-[10px] text-success font-bold mt-3 flex items-center gap-1">
              <span className="material-icons-round text-xs">today</span> Venta Hoy: ${stats.dailySalesTotal.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="bg-surface-dark p-8 rounded-[2rem] border border-surface-accent shadow-xl group hover:border-primary/40 transition-all">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Inversión en Insumos</p>
            <p className="text-3xl font-black text-white font-mono">${stats.totalPurchases.toLocaleString('es-CL')}</p>
            <p className="text-[10px] text-warning font-black mt-3 uppercase">Egresos del Mes</p>
          </div>
          <div className="bg-surface-dark p-8 rounded-[2rem] border border-surface-accent shadow-xl group hover:border-primary/40 transition-all">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Valor Inventario</p>
            <p className="text-3xl font-black text-white font-mono">${stats.inventoryValue.toLocaleString('es-CL')}</p>
            <p className="text-[10px] text-primary font-bold mt-3 uppercase tracking-tighter">Activos Circulantes</p>
          </div>
          <div className="bg-surface-dark p-8 rounded-[2rem] border border-surface-accent shadow-xl group hover:border-primary/40 transition-all">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ganancia Neta (Mes)</p>
            <p className={`text-3xl font-black font-mono ${stats.profit >= 0 ? 'text-white' : 'text-danger'}`}>
              ${stats.profit.toLocaleString('es-CL')}
            </p>
            <p className={`text-[10px] font-black mt-3 ${stats.margin > 20 ? 'text-success' : 'text-warning'}`}>
              RENTABILIDAD: {stats.margin.toFixed(1)}%
            </p>
          </div>
        </section>

        <section className="col-span-12 bg-surface-dark p-10 rounded-[3rem] border border-surface-accent shadow-2xl">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-widest">
                Dinámica de Ventas & IA
                {isProjecting && <span className="w-3 h-3 bg-primary rounded-full animate-ping"></span>}
              </h3>
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Estimación de Comportamiento a Futuro</p>
            </div>
            <div className="flex bg-background-dark border border-surface-accent p-1.5 rounded-2xl">
              {(['1m', '3m', '6m', '1y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProjectionPeriod(p)}
                  className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all ${projectionPeriod === p ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData.length > 0 ? projectionData : []}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008080" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d2e2e', border: '1px solid #143d3d', borderRadius: '24px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ventas" stroke="#008080" strokeWidth={5} fill="url(#colorVentas)" name="Ventas" />
                <Area type="monotone" dataKey="proyeccion" stroke="#2dd4bf" strokeWidth={3} strokeDasharray="5 5" fill="none" name="Proyección IA" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* REPORTE DE CIERRE MENSUAL AL FINAL */}
        <section className="col-span-12 bg-primary/10 p-12 rounded-[4rem] border border-primary/20 shadow-2xl">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Reporte de Cierre Mensual</h2>
              <p className="text-xs text-primary font-black uppercase tracking-widest mt-2">RESUMEN CONSOLIDADO • ESTADO DE RESULTADOS</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periodo</p>
              <p className="text-lg font-black text-white">{new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-8">
            <div className="bg-background-dark/50 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Total Facturación</p>
              <p className="text-3xl font-black text-white font-mono">${stats.totalSales.toLocaleString('es-CL')}</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[75%]"></div>
              </div>
            </div>
            <div className="bg-background-dark/50 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Inversión Realizada</p>
              <p className="text-3xl font-black text-white font-mono">${stats.totalPurchases.toLocaleString('es-CL')}</p>
              <p className="text-[10px] text-danger font-bold mt-2 italic">Flujo de Salida</p>
            </div>
            <div className="bg-background-dark/50 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Utilidad Neta</p>
              <p className="text-3xl font-black text-success font-mono">${stats.profit.toLocaleString('es-CL')}</p>
              <p className="text-[10px] text-success font-black mt-2">PROVECHO POSITIVO</p>
            </div>
            <div className="bg-background-dark/50 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Top Producto</p>
              <p className="text-xl font-black text-primary uppercase leading-tight">{stats.topProduct}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Líder en Ventas</p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <button onClick={() => window.print()} className="px-12 py-4 bg-white text-primary font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-3 uppercase tracking-widest text-xs">
              <span className="material-icons-round">description</span> Descargar Informe Completo (PDF)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
