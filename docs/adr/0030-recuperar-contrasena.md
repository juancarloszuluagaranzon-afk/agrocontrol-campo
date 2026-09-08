# ADR-0030 — Recuperación de contraseña por correo (Supabase Auth)

Fecha: 2026-09-07 · Estado: aceptado

## Contexto

Los usuarios que olvidaban su contraseña no tenían salida: el login solo ofrecía "Entrar" y "Crear
cuenta", y el único camino era que el administrador la reseteara a mano en el dashboard de Supabase.
Además, el login mostraba "Correo o contraseña incorrectos" para cualquier error, sin pista.

## Decisión

- **"¿Olvidaste tu contraseña?"** en el login (modo `recuperar`): pide el correo y llama a
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/restablecer })`. El mensaje de
  éxito es genérico ("si el correo está registrado…") para **no revelar si un correo existe**.
- **Página pública `/restablecer`** (fuera de `(tabs)`, sin AuthGate): destino del enlace del correo.
  Supabase abre una **sesión de recuperación**; la página la detecta (`getSession`, y canjea `?code=`
  con `exchangeCodeForSession` en el flujo PKCE, o escucha `PASSWORD_RECOVERY`), pide **nueva
  contraseña + confirmación** y la guarda con `auth.updateUser({ password })`; luego entra al mapa.
  Sin sesión ni código válido, informa "enlace inválido o vencido" y lleva al login.
- **Validación en el borde con Zod** en `domain/auth/schema.ts` (puro, testeado): correo; contraseña
  mínimo 6 + confirmación coincidente. `mensajeErrorRecuperacion()` traduce los errores relevantes de
  Supabase (rate limit, misma contraseña, débil) a español sin filtrar información.
- Textos en `lib/i18n/es-CO.ts` (`t.auth`).

## Requisito de configuración (dashboard de Supabase, lo hace el administrador)

`Authentication → URL Configuration → Redirect URLs` debe incluir el destino del enlace:
`https://riomap.vercel.app/restablecer` (y `http://localhost:3200/restablecer` para desarrollo). Sin
esto Supabase no redirige a la página y el enlace del correo no sirve.

## Consecuencias

- Autoservicio: cada usuario recupera su contraseña sin intervención del administrador.
- El correo lo envía Supabase (SMTP por defecto, **limitado a pocos envíos por hora** en el plan Free).
  Si el volumen crece, configurar **SMTP propio** (Authentication → SMTP Settings). La plantilla "Reset
  Password" puede traducirse al español en el dashboard.
- Requiere señal (no es un flujo offline).
- Sin dependencias nuevas. El e2e cubre la UI del login/recuperación y el estado "enlace inválido" de
  `/restablecer` (el envío real del correo no se prueba en CI).

## Alternativas descartadas

- **Reset manual por el administrador** (estado anterior): no escala y bloquea al técnico en campo.
- **Magic link / OTP por correo** como login principal: cambia el modelo de autenticación de toda la
  app; se prefiere mantener usuario+contraseña y añadir solo la recuperación.
