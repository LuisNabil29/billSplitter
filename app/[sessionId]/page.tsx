'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import BillItemsList from '@/components/BillItemsList';
import TotalDisplay from '@/components/TotalDisplay';
import UserAssignment from '@/components/UserAssignment';
import { Session, BillItem } from '@/lib/types';

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [userTotals, setUserTotals] = useState<Array<{ userId: string; userName: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cargar sesión inicial
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Configurar SSE para actualizaciones en tiempo real
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/sync/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          setSession({
            ...data.session,
            createdAt: new Date(data.session.createdAt),
            users: data.session.users.map((u: any) => ({
              ...u,
              joinedAt: new Date(u.joinedAt),
            })),
          });
          setUserTotals(data.userTotals || []);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      // Reconectar después de un delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          loadSession();
        }
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/session/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sesión no encontrada');
      }

      setSession({
        ...data.session,
        createdAt: new Date(data.session.createdAt),
        users: data.session.users.map((u: any) => ({
          ...u,
          joinedAt: new Date(u.joinedAt),
        })),
      });
      setUserTotals(data.userTotals || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (userName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addUser',
          userName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al unirse a la sesión');
      }

      setCurrentUserId(data.user.id);
      setCurrentUserName(data.user.name);
      
      // La actualización vendrá vía SSE
    } catch (err: any) {
      alert(err.message || 'Error al unirse a la sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleItemQuantityAssign = async (itemId: string, quantity: number) => {
    if (!currentUserId || !sessionId) return;

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assignItemQuantity',
          itemId,
          userId: currentUserId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar cantidad');
      }

      // La actualización vendrá vía SSE
    } catch (err: any) {
      console.error('Error assigning item quantity:', err);
      alert(err.message || 'Error al asignar cantidad. Por favor intenta de nuevo.');
    }
  };

  const handleItemEdit = async (itemId: string, updates: { name?: string; price?: number; quantity?: number }) => {
    if (!session) return;

    // Validar actualizaciones
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      alert('El nombre del item no puede estar vacío');
      return;
    }

    if (updates.price !== undefined && (isNaN(updates.price) || updates.price < 0)) {
      alert('El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    if (updates.quantity !== undefined && (isNaN(updates.quantity) || updates.quantity < 1)) {
      alert('La cantidad debe ser un número válido mayor a 0');
      return;
    }

    // Actualizar localmente
    setSession({
      ...session,
      items: session.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });

    // TODO: Enviar actualización al servidor si es necesario
    // Por ahora solo actualizamos localmente ya que el estado está en memoria del servidor
  };

  // Notificar cambios al servidor para que propague vía SSE
  useEffect(() => {
    if (session && sessionId) {
      // El servidor ya tiene el estado, solo necesitamos que propague los cambios
      // Esto se hace automáticamente cuando se llama a los endpoints POST
    }
  }, [session, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-red-200 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error || 'Sesión no encontrada'}</p>
        </div>
      </div>
    );
  }

  const total = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary-dark">
            Sesión de Cuenta Compartida
          </h1>
          <p className="text-gray-600">
            Sesión ID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
          </p>
        </div>

        <div className="space-y-6">
          {!currentUserId && (
            <UserAssignment onJoin={handleJoin} />
          )}

          {currentUserId && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Items de la Cuenta</h2>
                  <BillItemsList
                    items={session.items}
                    onItemEdit={handleItemEdit}
                    onItemQuantityAssign={handleItemQuantityAssign}
                    currentUserId={currentUserId}
                    editable={true}
                  />
                </div>

                <div>
                  <TotalDisplay userTotals={userTotals} itemsTotal={total} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

