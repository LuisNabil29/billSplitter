import { NextRequest, NextResponse } from 'next/server';
import { processReceiptImage } from '@/lib/ocr';
import { createSession, addItemsToSession } from '@/lib/session-store';
import { getSessionURL, generateQRCodeDataURL } from '@/lib/qr-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const imageBase64 = formData.get('imageBase64') as string | null;
    const imageMimeType = formData.get('imageMimeType') as string | null;

    if (!imageBase64 || !imageMimeType) {
      return NextResponse.json(
        { error: 'Imagen no proporcionada' },
        { status: 400 }
      );
    }

    // Procesar imagen con OCR
    const ocrResult = await processReceiptImage(imageBase64, imageMimeType);

    if (!ocrResult.success || ocrResult.items.length === 0) {
      return NextResponse.json(
        {
          error: ocrResult.error || 'No se pudieron extraer items de la imagen',
          items: [],
        },
        { status: 400 }
      );
    }

    // Crear sesión (no guardamos la imagen en el servidor por ahora)
    const session = createSession();

    // Agregar items a la sesión (esto asigna IDs únicos a cada item)
    const updatedSession = addItemsToSession(session.id, ocrResult.items);
    
    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Error al crear la sesión' },
        { status: 500 }
      );
    }

    // Generar QR code
    const sessionURL = getSessionURL(session.id);
    const qrCodeDataURL = await generateQRCodeDataURL(sessionURL);

    return NextResponse.json({
      sessionId: session.id,
      items: updatedSession.items, // Usar items con IDs asignados
      qrCode: qrCodeDataURL,
      sessionURL,
    });
  } catch (error: any) {
    console.error('Error en /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}

