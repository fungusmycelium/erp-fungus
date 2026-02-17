# SOLUCIÓN: Límite de Correos (Rate Limit)

El error "email rate limit exceeded" ocurre porque Supabase bloquea el envío excesivo de correos de confirmación.

## Solución Rápida (Para entrar YA):
1. Ve a tu panel de **Supabase** (https://supabase.com/dashboard).
2. Entra a "Authentication" -> "Users".
3. Busca tu email (`italotavonatti@gmail.com`).
4. Haz clic en los 3 puntos (...) y selecciona **"Confirm user"**.
5. Vuelve a la App e **Inicia Sesión** (No te registres de nuevo).

## Solución Permanente:
1. En Supabase, ve a "Authentication" -> "Providers" -> "Email".
2. Desactiva **"Confirm email"**.
3. Guarda los cambios.

He actualizado la pantalla de login para mostrar mensajes más amigables en el futuro.
