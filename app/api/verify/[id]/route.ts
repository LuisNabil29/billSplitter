import { NextRequest, NextResponse } from 'next/server';
import { verifyAndCorrectItems } from '@/lib/ocr';
import { getSession, updateItemInSession } from '@/lib/session-store';
import { notifyClients } from '@/lib/sse-notifier';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { imageBase64, imageMimeType, totalFromReceipt } = body;

    if (!imageBase64 || !imageMimeType) {
      return NextResponse.json(
        { error: 'Imagen requerida para verificación' },
        { status: 400 }
      );
    }

    // Obtener la sesión actual
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Convertir items de la sesión al formato esperado por verifyAndCorrectItems
    const itemsWithoutIds = session.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      verificationIssue: item.verificationIssue,
    }));

    // Re-ejecutar la verificación
    const verificationResult = await verifyAndCorrectItems(
      itemsWithoutIds,
      imageBase64,
      imageMimeType,
      totalFromReceipt
    );

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: verificationResult.error || 'Error en la verificación' },
        { status: 500 }
      );
    }

    // Actualizar los items en la sesión con los resultados de la verificación
    // Mantener los IDs originales pero actualizar los campos verificados
    for (let i = 0; i < session.items.length && i < verificationResult.items.length; i++) {
      const originalItem = session.items[i];
      const verifiedItem = verificationResult.items[i];

      // Solo actualizar si hay cambios
      if (
        originalItem.price !== verifiedItem.price ||
        originalItem.quantity !== verifiedItem.quantity ||
        JSON.stringify(originalItem.verificationIssue) !== JSON.stringify(verifiedItem.verificationIssue)
      ) {
        await updateItemInSession(id, originalItem.id, {
          price: verifiedItem.price,
          quantity: verifiedItem.quantity,
        });

        // También necesitamos actualizar verificationIssue, pero updateItemInSession no lo soporta aún
        // Lo haremos directamente en la sesión
        const updatedSession = await getSession(id);
        if (updatedSession) {
          const itemToUpdate = updatedSession.items.find(item => item.id === originalItem.id);
          if (itemToUpdate) {
            itemToUpdate.verificationIssue = verifiedItem.verificationIssue;
          }
        }
      }
    }

    // Obtener la sesión actualizada
    const updatedSession = await getSession(id);

    // Notificar a los clientes SSE
    await notifyClients(id);

    return NextResponse.json({
      session: updatedSession,
      totalFromReceipt: verificationResult.totalExpected,
      totalCalculated: verificationResult.totalCalculated,
      hasIssues: verificationResult.issues.length > 0,
      verificationIssues: verificationResult.issues,
    });
  } catch (error: any) {
    console.error('Error en POST /api/verify/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar items' },
      { status: 500 }
    );
  }
}

