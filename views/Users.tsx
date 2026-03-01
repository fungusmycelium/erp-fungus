
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type UserRole = 'CEO' | 'SUPERVISOR' | 'VENDEDOR' | 'OPERATOR';

interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    role: UserRole;
    created_at: string;
}

const Users: React.FC<{ currentRole: string }> = ({ currentRole }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        const { data: profilesData, error: profError } = await supabase
            .from('profiles')
            .select('*');

        if (profError) {
            console.error('Error fetching profiles:', profError);
            alert('Error al cargar perfiles. ¿Ha ejecutado el SQL para agregar la columna email?');
        } else {
            setProfiles(profilesData || []);
        }
        setLoading(false);
    };

    const deleteProfile = async (id: string) => {
        if (id === '75fc1e96-ff6c-4017-a87e-35662a92624c') {
            alert('No se puede eliminar la cuenta principal del CEO.');
            return;
        }

        if (!confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            alert('Error eliminando usuario: ' + error.message);
        } else {
            setProfiles(profiles.filter(p => p.id !== id));
            alert('Usuario eliminado exitosamente');
        }
    };

    const updateRole = async (id: string, newRole: UserRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', id);

        if (error) {
            alert('Error actualizando rol: ' + error.message);
        } else {
            setProfiles(profiles.map(p => p.id === id ? { ...p, role: newRole } : p));
            alert('Rol actualizado exitosamente');
        }
    };

    return (
        <div className="p-8 bg-background-dark min-h-screen">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-white">Gestión de Usuarios</h1>
                <p className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Permisos y Accesos del Sistema</p>
            </header>

            <div className="bg-surface-dark/40 rounded-[3rem] border border-surface-accent overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-background-dark/60 text-slate-500 border-b border-surface-accent">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-primary">Nombre / Email</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">ID UUID</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">Rol Actual</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">Cambiar Permisos</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-accent/30">
                        {profiles.map(profile => (
                            <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-icons-round text-sm">person</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-0.5">{profile.full_name || profile.email || 'Usuario sin nombre'}</p>
                                            {profile.full_name && <p className="text-[10px] text-slate-400 font-medium mb-1">{profile.email}</p>}
                                            <p className="text-[10px] text-slate-500 uppercase font-black">Registrado: {new Date(profile.created_at).toLocaleDateString('es-CL')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <p className="text-[10px] font-mono text-slate-600 truncate w-24" title={profile.id}>{profile.id}</p>
                                </td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${profile.role === 'CEO' ? 'bg-primary/20 text-primary border border-primary/30' :
                                        profile.role === 'SUPERVISOR' ? 'bg-success/20 text-success border border-success/30' :
                                            'bg-slate-700/50 text-slate-400 border border-slate-600'
                                        }`}>
                                        {profile.role}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex gap-2">
                                        {currentRole === 'CEO' ? (
                                            <>
                                                {(['VENDEDOR', 'SUPERVISOR', 'ADMIN', 'CEO'] as UserRole[]).map(role => (
                                                    <button
                                                        key={role}
                                                        onClick={() => updateRole(profile.id, role)}
                                                        disabled={profile.role === role}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${profile.role === role ? 'opacity-30 cursor-not-allowed border border-white/10' : 'bg-surface-accent hover:bg-primary hover:text-white border border-transparent'
                                                            }`}
                                                    >
                                                        {role}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => deleteProfile(profile.id)}
                                                    className="ml-4 p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all"
                                                    title="Eliminar Usuario"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-slate-500 italic">Solo lectura (Requiere CEO)</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {profiles.length === 0 && !loading && (
                            <tr>
                                <td colSpan={3} className="p-20 text-center text-slate-500 font-bold italic">
                                    No se encontraron perfiles de usuario registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="material-icons-round text-sm">info</span>
                    Guía de Jerarquía
                </h3>
                <div className="grid grid-cols-3 gap-6 mt-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-white uppercase">Vendedor</p>
                        <p className="text-[9px] text-slate-500">Acceso a Ventas, CRM y Catálogo limitado.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-success uppercase">Supervisor</p>
                        <p className="text-[9px] text-slate-500">Gestión de Compras, Inventario y Reportes.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary uppercase">CEO / ADMIN</p>
                        <p className="text-[9px] text-slate-500">Control total, gestión de usuarios y finanzas críticas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Users;
