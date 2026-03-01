
import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
}) => {
    if (totalPages <= 1 && totalItems <= itemsPerPage) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            pages.push(i);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pages.push('...');
        }
    }

    const uniquePages = [...new Set(pages)];

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 p-4 bg-surface-dark/40 border border-surface-accent rounded-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mostrar</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="bg-background-dark border border-surface-accent rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-primary transition-colors"
                >
                    {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                            {n}
                        </option>
                    ))}
                </select>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">registros</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-dark border border-surface-accent text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all"
                >
                    <span className="material-icons-round text-sm">chevron_left</span>
                </button>

                <div className="flex items-center gap-1 mx-2">
                    {uniquePages.map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span className="px-2 text-slate-600">...</span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(Number(page))}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${currentPage === page
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-background-dark border border-surface-accent text-slate-400 hover:border-primary hover:text-primary'
                                        }`}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-dark border border-surface-accent text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all"
                >
                    <span className="material-icons-round text-sm">chevron_right</span>
                </button>
            </div>

            <div className="hidden md:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Mostrando <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="text-primary">{totalItems}</span>
                </p>
            </div>
        </div>
    );
};

export default Pagination;
