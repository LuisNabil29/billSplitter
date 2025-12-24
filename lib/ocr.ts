import OpenAI from 'openai';
import { BillItem } from './types';

// Inicializar OpenAI solo si la API key está disponible
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
  }
  return new OpenAI({
    apiKey,
  });
};

export interface OCRResult {
  items: Omit<BillItem, 'id' | 'assignments'>[];
  totalFromReceipt?: number; // Total extraído de la imagen
  success: boolean;
  error?: string;
}

/**
 * Procesa una imagen usando GPT-4o-mini para extraer items de una cuenta de restaurante
 * @param imageBase64 - Imagen en base64 (sin el prefijo data:image/...)
 * @param imageMimeType - Tipo MIME de la imagen (ej: 'image/jpeg', 'image/png')
 */
export async function processReceiptImage(
  imageBase64: string,
  imageMimeType: string
): Promise<OCRResult> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en extraer información de recibos de restaurantes. 
          Analiza la imagen del recibo y extrae todos los items con sus precios y el total del recibo.
          Responde SOLO con un JSON válido en el siguiente formato:
          {
            "items": [
              {"name": "nombre del item", "price": 25.50, "quantity": 2},
              {"name": "otro item", "price": 15.00, "quantity": 1}
            ],
            "total": 450.00
          }
          - "price" es el precio UNITARIO de cada item
          - "quantity" es la cantidad de ese item (si no se especifica, usa 1)
          - "total" es el monto total final que aparece en el recibo (busca "Total", "Total a Pagar", etc.)
          Si no puedes identificar claramente un precio, usa 0.00.
          Si no puedes identificar la cantidad, usa 1.
          Si no encuentras el total del recibo, omite el campo "total".
          Ignora impuestos, propinas y subtotales. Solo extrae los items individuales y el total final.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: 'Extrae todos los items de esta cuenta de restaurante con sus precios.',
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        items: [],
        success: false,
        error: 'No se recibió respuesta de OpenAI',
      };
    }

    try {
      const parsed = JSON.parse(content);
      const items: Omit<BillItem, 'id' | 'assignments'>[] = (parsed.items || []).map((item: any) => ({
        name: String(item.name || '').trim(),
        price: parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 1,
      })).filter((item: any) => item.name.length > 0 && item.price > 0 && item.quantity > 0);

      const totalFromReceipt = parsed.total ? parseFloat(parsed.total) : undefined;

      return {
        items: items as BillItem[],
        totalFromReceipt,
        success: true,
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return {
        items: [],
        success: false,
        error: 'Error al parsear la respuesta de OpenAI',
      };
    }
  } catch (error: any) {
    console.error('Error processing image with OCR:', error);
    return {
      items: [],
      success: false,
      error: error.message || 'Error desconocido al procesar la imagen',
    };
  }
}

/**
 * Convierte un File/Blob a base64
 */
export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo data:image/...;base64,
      const base64Match = result.match(/base64,(.+)$/);
      const mimeTypeMatch = result.match(/data:([^;]+)/);
      
      if (base64Match && mimeTypeMatch) {
        resolve({
          base64: base64Match[1],
          mimeType: mimeTypeMatch[1],
        });
      } else {
        reject(new Error('Error al convertir archivo a base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Optimiza una imagen reduciendo su tamaño si es necesario
 * Esto ayuda a reducir tokens y costos de la API
 */
export function optimizeImage(file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve(file); // Si no hay canvas support, devolver el archivo original
      return;
    }

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => resolve(file); // Si falla, devolver original
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Interface para el resultado de la verificación
 */
export interface VerificationResult {
  items: Omit<BillItem, 'id' | 'assignments'>[];
  totalExpected?: number;
  totalCalculated: number;
  issues: Array<{
    itemIndex: number;
    type: 'unit_price_mismatch' | 'sum_mismatch' | 'suspicious_quantity';
    message: string;
    suggestedFix?: {
      price?: number;
      quantity?: number;
    };
  }>;
  success: boolean;
  error?: string;
}

/**
 * Verifica y corrige items extraídos comparando con la imagen original
 * Esta es la "segunda pasada" que detecta errores como precios totales en lugar de unitarios
 */
export async function verifyAndCorrectItems(
  items: Omit<BillItem, 'id' | 'assignments'>[],
  imageBase64: string,
  imageMimeType: string,
  totalFromReceipt?: number
): Promise<VerificationResult> {
  try {
    const openai = getOpenAIClient();

    // Calcular el total actual
    const totalCalculated = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Preparar el contexto para la IA
    const itemsContext = items.map((item, idx) => ({
      index: idx,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un verificador experto de extracciones de recibos de restaurantes.
          
Tu tarea es revisar una lista de items extraídos y compararla con la imagen original del recibo para detectar errores comunes.

**Errores comunes a detectar:**

1. **Precio total en lugar de unitario (unit_price_mismatch)**:
   - Si quantity > 1 y el "price" parece ser el TOTAL (no el unitario)
   - Ejemplo: quantity=3, price=150, pero en la imagen dice "$50 c/u × 3 = $150"
   - En este caso, el precio unitario correcto sería: 150 / 3 = 50
   
2. **Suma no cuadra con el total del recibo (sum_mismatch)**:
   - Si el total calculado (suma de price × quantity) difiere del total del recibo en más del 5%
   - Revisa si algún item fue extraído incorrectamente
   
3. **Cantidad sospechosa (suspicious_quantity)**:
   - Si la cantidad parece incorrecta comparada con lo que aparece en la imagen

**Responde SOLO con JSON válido:**
{
  "totalExpected": 450.00,
  "totalCalculated": 445.50,
  "issues": [
    {
      "itemIndex": 0,
      "type": "unit_price_mismatch",
      "message": "El precio $150 parece ser el total de 3 unidades, no el unitario. Precio unitario sugerido: $50",
      "suggestedFix": { "price": 50.00 }
    }
  ]
}

Si no encuentras problemas, devuelve un array vacío en "issues".
Si no hay un total esperado del recibo, omite "totalExpected".`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: `Verifica estos items extraídos del recibo:

Items extraídos:
${JSON.stringify(itemsContext, null, 2)}

Total del recibo detectado: ${totalFromReceipt ? `$${totalFromReceipt.toFixed(2)}` : 'No disponible'}
Total calculado (suma de items): $${totalCalculated.toFixed(2)}

Por favor verifica:
1. ¿El "price" de cada item es el precio UNITARIO o el total?
2. ¿La suma de todos los items cuadra con el total del recibo?
3. ¿Las cantidades son correctas?

Identifica problemas y sugiere correcciones.`,
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        items,
        totalCalculated,
        totalExpected: totalFromReceipt,
        issues: [],
        success: false,
        error: 'No se recibió respuesta de OpenAI en la verificación',
      };
    }

    try {
      const parsed = JSON.parse(content);
      const issues = parsed.issues || [];

      // Aplicar las correcciones sugeridas a los items
      const correctedItems = items.map((item, idx) => {
        const issue = issues.find((i: any) => i.itemIndex === idx);
        if (issue && issue.suggestedFix) {
          return {
            ...item,
            price: issue.suggestedFix.price ?? item.price,
            quantity: issue.suggestedFix.quantity ?? item.quantity,
            verificationIssue: {
              type: issue.type,
              message: issue.message,
              suggestedFix: issue.suggestedFix,
            },
          };
        }
        return item;
      });

      // Recalcular el total con las correcciones
      const newTotalCalculated = correctedItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      return {
        items: correctedItems,
        totalExpected: parsed.totalExpected || totalFromReceipt,
        totalCalculated: newTotalCalculated,
        issues,
        success: true,
      };
    } catch (parseError) {
      console.error('Error parsing verification response:', parseError);
      return {
        items,
        totalCalculated,
        totalExpected: totalFromReceipt,
        issues: [],
        success: false,
        error: 'Error al parsear la respuesta de verificación',
      };
    }
  } catch (error: any) {
    console.error('Error in verification:', error);
    return {
      items,
      totalCalculated: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      totalExpected: totalFromReceipt,
      issues: [],
      success: false,
      error: error.message || 'Error desconocido en la verificación',
    };
  }
}
