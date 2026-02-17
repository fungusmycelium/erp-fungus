
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SaleRecord, PurchaseRecord, InventoryItem } from '../types';

import { supabase } from '../lib/supabase';
import { mapSaleRecord, mapPurchaseRecord, mapInventoryItem } from '../lib/mappers';

const Analysis: React.FC = () => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      const { data: sData } = await supabase.from('sales').select('*, items:sale_items(*), customer:customers(*)');
      const { data: pData } = await supabase.from('purchases').select('*, items:purchase_items(*)');
      const { data: iData } = await supabase.from('inventory_items').select('*');

      const sales = sData?.map(mapSaleRecord) || [];
      const purchases = pData?.map(mapPurchaseRecord) || [];
      const inventory = iData?.map(mapInventoryItem) || [];

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analiza los siguientes datos empresariales de Fungus Mycelium Ltda y propón una estrategia de optimización para el próximo mes.
        Ventas: ${JSON.stringify(sales)}
        Compras: ${JSON.stringify(purchases)}
        Inventario: ${JSON.stringify(inventory)}
        Provee: 1. Análisis de rentabilidad real. 2. Productos críticos a reponer o liquidar. 3. Proyección de flujo de caja. 4. Consejos estratégicos de crecimiento.
        Formato: Markdown profesional.`,
      });

      setReport(response.text || 'Sin respuesta de IA.');
    } catch (error) {
      console.error(error);
      setReport("Error al generar el análisis estratégico. Verifique su conexión y configuración.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full bg-background-dark overflow-y-auto">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Análisis Estratégico AI</h1>
          <p className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Inteligencia Artificial Gemini para Optimización de Negocio</p>
        </div>
        <button
          onClick={runFullAnalysis}
          disabled={loading}
          className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          {loading ? (
            <span className="material-icons-round animate-spin">sync</span>
          ) : (
            <span className="material-icons-round">psychology</span>
          )}
          GENERAR ESTRATEGIA INTEGRAL
        </button>
      </header>

      <main className="bg-surface-dark/40 p-12 rounded-[3.5rem] border border-surface-accent shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center py-40 gap-6 opacity-40">
            <span className="material-icons-round text-8xl animate-pulse text-primary">data_object</span>
            <p className="text-xl font-black uppercase tracking-widest animate-pulse">Procesando Base de Datos Maestra...</p>
          </div>
        ) : report ? (
          <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-primary animate-in fade-in slide-in-from-top-4">
            <div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>') }} />
          </div>
        ) : (
          <div className="flex flex-col items-center py-40 gap-6 opacity-20">
            <span className="material-icons-round text-8xl">insights</span>
            <p className="text-xl font-black uppercase tracking-widest">Inicie el análisis para obtener proyecciones</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analysis;
