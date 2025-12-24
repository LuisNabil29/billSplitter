import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, addUserToSession, assignItemQuantityToUser, updateItemInSession, getUserTotal } from '@/lib/session-store';
import { notifyClients } from '@/lib/sse-notifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Calcular totales por usuario
    const userTotals = await Promise.all(
      session.users.map(async (user) => ({
        userId: user.id,
        userName: user.name,
        total: await getUserTotal(id, user.id),
      }))
    );

    return NextResponse.json({
      session: {
        ...session,
        users: session.users.map(u => ({
          ...u,
          joinedAt: u.joinedAt.toISOString(),
        })),
        createdAt: session.createdAt.toISOString(),
      },
      userTotals,
    });
  } catch (error: any) {
    console.error('Error en GET /api/session/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener sesión' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userName, itemId, userId, quantity, updates } = body;

    if (action === 'addUser') {
      if (!userName) {
        return NextResponse.json(
          { error: 'Nombre de usuario requerido' },
          { status: 400 }
        );
      }

      const result = await addUserToSession(id, userName);
      if (!result) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      // Notificar a los clientes SSE
      await notifyClients(id);

      return NextResponse.json({
        user: result.user,
        session: result.session,
      });
    }

    if (action === 'assignItemQuantity') {
      if (!itemId || !userId || quantity === undefined) {
        return NextResponse.json(
          { error: 'itemId, userId y quantity requeridos' },
          { status: 400 }
        );
      }

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty < 0) {
        return NextResponse.json(
          { error: 'quantity debe ser un número válido mayor o igual a 0' },
          { status: 400 }
        );
      }

      const session = await assignItemQuantityToUser(id, itemId, userId, qty);
      if (!session) {
        return NextResponse.json(
          { error: 'Sesión o item no encontrado' },
          { status: 404 }
        );
      }

      // Notificar a los clientes SSE
      await notifyClients(id);

      const userTotal = await getUserTotal(id, userId);

      return NextResponse.json({
        session,
        userTotal,
      });
    }

    if (action === 'updateItem') {
      if (!itemId || !updates) {
        return NextResponse.json(
          { error: 'itemId y updates requeridos' },
          { status: 400 }
        );
      }

      const session = await updateItemInSession(id, itemId, updates);
      if (!session) {
        return NextResponse.json(
          { error: 'Sesión o item no encontrado' },
          { status: 404 }
        );
      }

      // Notificar a los clientes SSE
      await notifyClients(id);

      return NextResponse.json({
        session,
      });
    }

    if (action === 'applySuggestedFix') {
      if (!itemId) {
        return NextResponse.json(
          { error: 'itemId requerido' },
          { status: 400 }
        );
      }

      // Obtener la sesión y el item
      const session = await getSession(id);
      if (!session) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      const item = session.items.find(i => i.id === itemId);
      if (!item || !item.verificationIssue?.suggestedFix) {
        return NextResponse.json(
          { error: 'Item o corrección sugerida no encontrada' },
          { status: 404 }
        );
      }

      // Aplicar la corrección sugerida
      const suggestedFix = item.verificationIssue.suggestedFix;
      const updatedSession = await updateItemInSession(id, itemId, {
        price: suggestedFix.price ?? item.price,
        quantity: suggestedFix.quantity ?? item.quantity,
      });

      if (!updatedSession) {
        return NextResponse.json(
          { error: 'Error al actualizar item' },
          { status: 500 }
        );
      }

      // Remover el verificationIssue del item después de aplicar la corrección
      const updatedItem = updatedSession.items.find(i => i.id === itemId);
      if (updatedItem) {
        delete updatedItem.verificationIssue;
        // Guardar la sesión con el verificationIssue removido
        await updateSession(id, updatedSession);
      }

      // Notificar a los clientes SSE
      await notifyClients(id);

      return NextResponse.json({
        session: updatedSession,
      });
    }

    if (action === 'dismissVerificationIssue') {
      if (!itemId) {
        return NextResponse.json(
          { error: 'itemId requerido' },
          { status: 400 }
        );
      }

      // Obtener la sesión y el item
      const session = await getSession(id);
      if (!session) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      const item = session.items.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json(
          { error: 'Item no encontrado' },
          { status: 404 }
        );
      }

      // Remover el verificationIssue
      delete item.verificationIssue;

      // Actualizar la sesión
      const updatedSession = await updateSession(id, session);

      // Notificar a los clientes SSE
      await notifyClients(id);

      return NextResponse.json({
        session: updatedSession,
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en POST /api/session/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}

