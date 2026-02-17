
import React from 'react';

interface Props {
  onBack: () => void;
}

const TransactionDetails: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="pt-12 px-6 pb-4 bg-background-dark sticky top-0 z-50">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500">
            <span className="material-icons-round">close</span>
          </button>
          <h1 className="text-lg font-semibold tracking-tight">New Transaction</h1>
          <button className="text-primary font-medium text-sm">Help</button>
        </div>
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold ring-4 ring-primary/20">1</div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Details</span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-700 mx-2 -mt-6"></div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Line Items</span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-700 mx-2 -mt-6"></div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Review</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-2 pb-32 hide-scrollbar">
        {/* Smart Scan Section */}
        <div className="mb-8">
          <button className="w-full bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl p-6 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-icons-round text-white">document_scanner</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-primary">Smart Scan OCR</p>
              <p className="text-xs text-slate-400 mt-1">Upload receipt to auto-fill details</p>
            </div>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-8">
          <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-light text-slate-500">$</span>
              <input 
                className="w-full bg-surface-dark border-none rounded-xl py-6 pl-12 pr-6 text-4xl font-semibold focus:ring-2 focus:ring-primary shadow-sm text-white" 
                defaultValue="2,450.00"
                type="text" 
              />
            </div>
            <div className="mt-2 px-1 flex items-center gap-1.5 text-success">
              <span className="material-icons-round text-sm">check_circle</span>
              <span className="text-xs font-medium">Within budget for 'Office Supplies'</span>
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Transaction Date</label>
            <div className="relative">
              <input 
                className="w-full bg-surface-dark border-none rounded-xl py-5 px-5 text-xl font-medium focus:ring-2 focus:ring-primary shadow-sm text-white" 
                defaultValue="10 / 24 / 2023"
                type="text" 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                <button className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs font-bold text-slate-300">Today</button>
                <span className="material-icons-round text-slate-500 self-center">calendar_today</span>
              </div>
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Vendor / Entity</label>
            <div className="relative">
              <input 
                className="w-full bg-surface-dark border-none rounded-xl py-5 px-5 text-xl font-medium focus:ring-2 focus:ring-primary shadow-sm text-white" 
                defaultValue="Amazon Web Services"
                type="text" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500">expand_more</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-background-dark/80 ios-blur border-t border-slate-800">
        <div className="flex gap-4">
          <button className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform">
            Save Draft
          </button>
          <button className="flex-[2] py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-transform flex items-center justify-center gap-2">
            Next Step
            <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="h-6 mt-4 flex justify-center items-end">
          <div className="w-32 h-1.5 bg-slate-700 rounded-full"></div>
        </div>
      </footer>
    </div>
  );
};

export default TransactionDetails;
