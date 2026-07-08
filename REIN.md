# Configurar PostgreSQL en Render

## Paso 1: Crear la base de datos

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Haz clic en **New +** → **PostgreSQL**
3. Completa:
   - **Name**: `paginapisos-db` (o el nombre que quieras)
   - **Database**: `paginapisos` (o el que quieras)
   - **User**: déjalo por defecto
   - **Region**: `Frankfurt (EU)` u `Oregon (US)`
   - **PostgreSQL Version**: `16`
   - **Plan**: **Free** ($0/mes, expira tras 90 días)
4. Haz clic en **Create Database**
5. Espera a que se cree (~2-3 minutos)

## Paso 2: Obtener la DATABASE_URL

1. En el dashboard de la base de datos, busca **Connections**
2. Copia el string **External Database URL**
3. Se ve así:
   ```
   postgresql://paginapisos_user:abc123...@dpg-xxxxx.frankfurt-postgres.render.com:5432/paginapisos
   ```

## Paso 3: Configurar en el proyecto

1. En tu **Render Dashboard** del servicio Web (`paginapisos`):
   - Ve a **Environment**
   - Agrega una variable:
     - **Key**: `DATABASE_URL`
     - **Value**: (pega el External Database URL del paso 2)
   - Guarda (**Save Changes**)

2. También asegúrate de que ya existe:
   - `JWT_SECRET` (con un valor secreto)

## Paso 4: Re-deploy

1. En el dashboard del servicio Web, ve a **Manual Deploy**
2. Selecciona **Deploy latest commit** o **Clear build cache & deploy**
3. En los logs deberías ver algo como:
   ```
   > prisma db push
   ...
   > prisma db seed
   ✅ Categorías creadas
   ✅ 116 productos importados
   ✅ Banner 1 (overlay) + Banner 2 (solo imagen)
   ✅ 12 categorias actualizadas con imagen
   ✅ Sucursales creadas
   ```

## Notas

- El plan **Free** de PostgreSQL en Render expira a los 90 días y tiene límite de 256MB
- Si necesitas más tiempo, puedes migrar a un plan pago ($7/mes) antes del vencimiento
- La IP de Render cambia, pero PostgreSQL en Render ya acepta conexiones internas automáticamente (no necesitas configurar reglas de firewall)
