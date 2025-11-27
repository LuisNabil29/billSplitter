# Bill Splitter - Aplicación para Dividir Cuentas de Restaurantes

Aplicación web desarrollada con Next.js 16 para dividir cuentas de restaurantes usando OCR con GPT-4o-mini, generación de códigos QR y sincronización en tiempo real.

## Características

- 📸 **Subida de imágenes**: Arrastra y suelta o selecciona imágenes de recibos
- 🤖 **OCR con GPT-4o-mini**: Extracción automática de items y precios usando OpenAI Vision API
- 📱 **Códigos QR**: Genera códigos QR para compartir sesiones fácilmente
- 👥 **Múltiples usuarios**: Varias personas pueden unirse y asignarse items
- ⚡ **Sincronización en tiempo real**: Actualizaciones instantáneas usando Server-Sent Events (SSE)
- ✏️ **Edición manual**: Corrige items extraídos incorrectamente
- 💰 **Cálculo automático**: Total por persona calculado automáticamente

## Tecnologías

- **Next.js 16** con App Router y Turbopack
- **TypeScript** para type safety
- **Tailwind CSS** para estilos
- **OpenAI GPT-4o-mini** para OCR
- **QRCode** para generación de códigos QR
- **Zustand** para estado del cliente
- **Server-Sent Events** para sincronización en tiempo real

## Requisitos

- Node.js 20.9.0 o superior
- npm o yarn
- API Key de OpenAI

## Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd billSpliter
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env.local` con tus variables de entorno:
```env
OPENAI_API_KEY=tu_api_key_de_openai
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## Uso

1. **Crear una sesión**:
   - Sube una imagen de la cuenta del restaurante
   - Espera a que el OCR procese la imagen
   - Revisa y edita los items extraídos si es necesario

2. **Compartir la sesión**:
   - Comparte el código QR o la URL con otros usuarios
   - Los usuarios pueden escanear el QR o ingresar la URL

3. **Unirse a la sesión**:
   - Los usuarios ingresan su nombre
   - Seleccionan los items que consumieron
   - Ven su total calculado automáticamente

4. **Asignar items**:
   - Haz clic en "Asignar" para asignar un item a ti
   - Haz clic en "Quitar" para desasignar un item
   - Los cambios se sincronizan en tiempo real

## Despliegue en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno:
   - `OPENAI_API_KEY`: Tu API key de OpenAI
   - `NEXT_PUBLIC_APP_URL`: La URL de tu aplicación en Vercel
3. Despliega

## Estructura del Proyecto

```
app/
  ├── page.tsx                    # Página principal (crear cuenta)
  ├── [sessionId]/
  │   └── page.tsx                # Vista de sesión compartida
  ├── api/
  │   ├── upload/route.ts         # Endpoint para subir imagen y procesar OCR
  │   ├── session/[id]/route.ts  # GET/POST para gestionar sesión
  │   └── sync/[id]/route.ts     # SSE endpoint para sincronización
lib/
  ├── ocr.ts                      # Lógica de OCR con OpenAI Vision
  ├── session-store.ts            # Store en memoria para sesiones
  ├── qr-generator.ts            # Generación de QR codes
  └── types.ts                    # Tipos TypeScript
components/
  ├── ImageUpload.tsx            # Componente para subir imagen
  ├── BillItemsList.tsx          # Lista de items de la cuenta
  ├── UserAssignment.tsx         # Asignación de items a usuarios
  ├── QRCodeDisplay.tsx           # Mostrar código QR
  └── TotalDisplay.tsx            # Mostrar totales por persona
```

## Notas

- El estado de las sesiones se almacena en memoria del servidor y se perderá al reiniciar
- Las imágenes se procesan en el cliente antes de enviarse al servidor para optimizar tokens
- GPT-4o-mini es más económico que GPT-4o y suficiente para esta tarea

## Licencia

MIT

