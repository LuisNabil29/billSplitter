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
  success: boolean;
  error?: string;
  model?: string;
  totalImage?: number;
  totalCalculated?: number;
  validationAttempts?: number;
  totalsMatch?: boolean;
}

/**
 * Procesa una imagen usando GPT-5-nano para extraer items de una cuenta de restaurante
 * @param imageBase64 - Imagen en base64 (sin el prefijo data:image/...)
 * @param imageMimeType - Tipo MIME de la imagen (ej: 'image/jpeg', 'image/png')
 */
export async function processReceiptImage(
  imageBase64: string,
  imageMimeType: string
): Promise<OCRResult> {
  const modelName = 'gpt-5-nano';
  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en extraer información de recibos de restaurantes. 
          Analiza la imagen del recibo y extrae todos los items con sus precios.
          
          PROCESO DE EXTRACCIÓN Y VALIDACIÓN:
          1. Extrae todos los items individuales con sus precios unitarios y cantidades
          2. Identifica el TOTAL de la cuenta mostrado en la imagen del recibo
          3. Calcula la suma de todos los items extraídos (price × quantity para cada item)
          4. Compara el total calculado con el total mostrado en la imagen
          5. Si NO coinciden (con margen de error de ±0.50):
             - Revisa CADA partida una por una para verificar si hay errores en precios o cantidades
             - Busca items que puedas haber omitido en la imagen
             - Verifica que los precios sean unitarios y no totales
             - Repite este proceso de validación hasta 5 veces si es necesario
          6. Si después de 5 intentos no logras que cuadre, reporta la discrepancia
          
          Responde SOLO con un JSON válido en el siguiente formato:
          {
            "items": [
              {"name": "nombre del item", "price": 25.50, "quantity": 2},
              {"name": "otro item", "price": 15.00, "quantity": 1}
            ],
            "total_image": 56.00,
            "total_calculated": 56.00,
            "validation_attempts": 1,
            "totals_match": true
          }
          
          REGLAS:
          - "price" es el precio UNITARIO de cada item
          - "quantity" es la cantidad de ese item (si no se especifica, usa 1)
          - "total_image" es el total que aparece en la imagen del recibo
          - "total_calculated" es la suma de (price × quantity) de todos los items
          - "validation_attempts" es el número de intentos que hiciste para validar
          - "totals_match" es true si los totales coinciden (±0.50), false si no
          - Si no puedes identificar claramente un precio, usa 0.00
          - Si no puedes identificar la cantidad, usa 1
          - Ignora impuestos, propinas si están separados del total. Solo extrae los items individuales.`,
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
        model: modelName,
      };
    }

    try {
      const parsed = JSON.parse(content);
      const items: Omit<BillItem, 'id' | 'assignments'>[] = (parsed.items || []).map((item: any) => ({
        name: String(item.name || '').trim(),
        price: parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 1,
      })).filter((item: any) => item.name.length > 0 && item.price > 0 && item.quantity > 0);

      return {
        items: items as BillItem[],
        success: true,
        model: modelName,
        totalImage: parsed.total_image ? parseFloat(parsed.total_image) : undefined,
        totalCalculated: parsed.total_calculated ? parseFloat(parsed.total_calculated) : undefined,
        validationAttempts: parsed.validation_attempts ? parseInt(parsed.validation_attempts) : undefined,
        totalsMatch: parsed.totals_match !== undefined ? Boolean(parsed.totals_match) : undefined,
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return {
        items: [],
        success: false,
        error: 'Error al parsear la respuesta de OpenAI',
        model: modelName,
      };
    }
  } catch (error: any) {
    console.error('Error processing image with OCR:', error);
    return {
      items: [],
      success: false,
      error: error.message || 'Error desconocido al procesar la imagen',
      model: 'gpt-5-nano',
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

