import { NextRequest, NextResponse } from 'next/server';
import { processReceiptImage, verifyAndCorrectItems } from '@/lib/ocr';
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

    // Paso 1: Extracción inicial con OCR
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

    // Paso 2: Verificación automática (segunda pasada)
    const verificationResult = await verifyAndCorrectItems(
      ocrResult.items,
      imageBase64,
      imageMimeType,
      ocrResult.totalFromReceipt
    );

    // Usar los items verificados (con correcciones aplicadas si las hay)
    const itemsToUse = verificationResult.success ? verificationResult.items : ocrResult.items;

    // Crear sesión (no guardamos la imagen en el servidor por ahora)
    const session = await createSession();

    // Agregar items a la sesión (esto asigna IDs únicos a cada item)
    const updatedSession = await addItemsToSession(session.id, itemsToUse);
    
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
      // Información de verificación
      totalFromReceipt: verificationResult.totalExpected,
      totalCalculated: verificationResult.totalCalculated,
      hasIssues: verificationResult.issues.length > 0,
      verificationIssues: verificationResult.issues,
    });
  } catch (error: any) {
    console.error('Error en /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}

