import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, addUserToSession, assignItemQuantityToUser, getUserTotal } from '@/lib/session-store';
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
    const { action, userName, itemId, userId, quantity } = body;

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

