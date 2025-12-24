# Sistema de Verificación Doble para OCR

## Resumen

Se ha implementado un sistema de **verificación en dos pasadas** para detectar y corregir errores comunes en la extracción de items de tickets, particularmente cuando el precio extraído es el total de múltiples unidades en lugar del precio unitario.

## Flujo del Sistema

### 1. Primera Pasada - Extracción Inicial
- El usuario sube una imagen del ticket
- GPT-4o-mini extrae los items (nombre, precio, cantidad) **y el total del ticket**
- Archivo: `lib/ocr.ts` → función `processReceiptImage()`

### 2. Segunda Pasada - Verificación Automática
- Inmediatamente después de la extracción, se ejecuta automáticamente una segunda llamada a la API
- GPT-4o-mini recibe:
  - Los items extraídos en la primera pasada
  - La imagen original del ticket
  - El total del ticket detectado
- Verifica:
  - ¿El precio de cada item es unitario o total?
  - ¿La suma de `price × quantity` cuadra con el total del ticket?
  - ¿Las cantidades son correctas?
- Archivo: `lib/ocr.ts` → función `verifyAndCorrectItems()`

### 3. Resultado con Issues Marcados
- Los items que tienen problemas detectados se marcan con un campo `verificationIssue`
- Este campo incluye:
  - `type`: tipo de problema (unit_price_mismatch, sum_mismatch, suspicious_quantity)
  - `message`: descripción del problema
  - `suggestedFix`: corrección sugerida (nuevo precio y/o cantidad)

### 4. UI de Verificación
- Los items con issues se muestran con un panel de advertencia amarillo/naranja
- El usuario puede:
  - ✅ **Aceptar la corrección**: Aplica automáticamente el `suggestedFix`
  - ✏️ **Editar manualmente**: Abre el editor para que el usuario corrija
  - ❌ **Ignorar**: Descarta la advertencia y mantiene los valores actuales

## Archivos Modificados

### Backend

1. **`lib/types.ts`**
   - Nuevo: `ItemVerificationIssue` interface
   - Modificado: `BillItem` ahora incluye campo opcional `verificationIssue`
   - Modificado: `OCRResult` ahora incluye `totalFromReceipt`

2. **`lib/ocr.ts`**
   - Modificado: `processReceiptImage()` ahora extrae también el total
   - Nuevo: `verifyAndCorrectItems()` función de segunda pasada
   - Nuevo: `VerificationResult` interface

3. **`app/api/upload/route.ts`**
   - Modificado: Ahora ejecuta ambas pasadas (extracción + verificación)
   - Retorna información adicional: `totalFromReceipt`, `totalCalculated`, `hasIssues`

4. **`app/api/session/[id]/route.ts`**
   - Nuevo action: `applySuggestedFix` - Aplica la corrección sugerida a un item
   - Nuevo action: `dismissVerificationIssue` - Ignora una advertencia

5. **`app/api/verify/[id]/route.ts`** (nuevo archivo)
   - Endpoint para re-ejecutar la verificación manualmente
   - Útil si el usuario edita items y quiere re-verificar

### Frontend

1. **`components/VerificationPanel.tsx`** (nuevo archivo)
   - Componente que muestra el panel de advertencia para items con issues
   - Incluye botones para aceptar, editar o ignorar

2. **`components/BillItemsList.tsx`**
   - Integra el `VerificationPanel` para cada item
   - Nuevas props: `onAcceptSuggestedFix`, `onDismissVerificationIssue`
   - Nuevos handlers internos para manejar las acciones de verificación

3. **`app/page.tsx`**
   - Implementa handlers para aceptar/ignorar correcciones
   - Pasa los handlers al componente `BillItemsList`

4. **`app/[sessionId]/page.tsx`**
   - Implementa handlers para aceptar/ignorar correcciones
   - Pasa los handlers al componente `BillItemsList`

## Ejemplo de Uso

### Caso: Precio Total en lugar de Unitario

**Ticket real:**
```
3x Tacos al Pastor    @ $50 c/u    $150
```

**Primera pasada (extracción inicial):**
```json
{
  "name": "Tacos al Pastor",
  "price": 150,
  "quantity": 3
}
```

**Segunda pasada (verificación):**
```json
{
  "itemIndex": 0,
  "type": "unit_price_mismatch",
  "message": "El precio $150 parece ser el total de 3 unidades, no el unitario. Precio unitario sugerido: $50",
  "suggestedFix": {
    "price": 50.00
  }
}
```

**Resultado en UI:**
- El item "Tacos al Pastor" se muestra con un panel amarillo
- Mensaje: "Posible error detectado"
- Corrección sugerida: "Precio unitario: $150 → $50"
- Botones: [✅ Aceptar] [✏️ Editar] [❌ Ignorar]

## Tipos de Issues Detectados

1. **`unit_price_mismatch`** (Más común)
   - Cuando `quantity > 1` y el precio parece ser el total, no el unitario
   - Ejemplo: quantity=3, price=150, pero debería ser price=50

2. **`sum_mismatch`**
   - Cuando la suma de todos los items no cuadra con el total del ticket
   - Tolerancia: ±5%

3. **`suspicious_quantity`**
   - Cuando la cantidad detectada parece incorrecta comparada con la imagen

## Consideraciones

### Costos
- Cada imagen = 2 llamadas a GPT-4o-mini
- Costo adicional: ~$0.0001-0.0003 por imagen (muy bajo)

### Latencia
- +1-2 segundos adicionales por la segunda pasada
- Se muestra feedback "Verificando..." al usuario

### Precisión
- La segunda pasada incluye la imagen nuevamente, lo que permite a la IA "leer" los detalles finos del ticket
- Mejora significativa en la detección de errores de precio unitario vs total

## Posibles Mejoras Futuras

1. **Re-verificación manual con botón**
   - Agregar un botón global "🔄 Re-verificar todos los items"
   - Útil después de que el usuario edite múltiples items

2. **Modal de confirmación de total**
   - Si el total detectado difiere >10% del calculado, mostrar modal
   - Permitir al usuario ingresar el total manualmente

3. **Modo de verificación estricta**
   - Bloquear el botón "Generar QR" si hay issues sin resolver
   - Configuración opcional para usuarios que quieren máxima precisión

4. **Estadísticas de verificación**
   - Mostrar cuántos items fueron corregidos automáticamente
   - Ayuda al usuario a confiar en el sistema

