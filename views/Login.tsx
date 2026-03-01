import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                alert('Registro exitoso. Por favor revisa tu correo para confirmar.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            let msg = err.message || 'Error desconocido';
            if (msg.includes('rate limit')) msg = 'Demasiados intentos. Por favor espera unos minutos o revisa tu correo.';
            if (msg.includes('User already registered')) msg = 'Este correo ya está registrado. Intenta iniciar sesión.';
            if (msg.includes('Invalid login credentials')) msg = 'Correo o contraseña incorrectos.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
            <div className="max-w-md w-full bg-surface-dark p-8 rounded-3xl border border-surface-accent shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">ERP Fungus</h1>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">Acceso al Sistema</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="nombre@empresa.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background-dark border-surface-accent border rounded-xl py-3 px-4 text-white text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-xs text-slate-500 font-bold hover:text-white transition-colors"
                    >
                        {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
                <div className="mt-8 pt-6 border-t border-surface-accent/50 text-center space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold">
                        ¿Problemas con el correo? Intenta usar <span className="text-primary">tu_email+1@gmail.com</span>
                    </p>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="text-[9px] text-slate-600 hover:text-danger uppercase tracking-widest font-black transition-colors"
                    >
                        Limpiar Datos Locales (Reset)
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Login;
