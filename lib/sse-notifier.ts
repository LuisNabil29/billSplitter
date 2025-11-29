import { getSession, getUserTotal } from './session-store';

// Store para mantener conexiones SSE activas
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function addClient(sessionId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(sessionId)) {
    clients.set(sessionId, new Set());
  }
  clients.get(sessionId)!.add(controller);
}

export function removeClient(sessionId: string, controller: ReadableStreamDefaultController) {
  clients.get(sessionId)?.delete(controller);
  if (clients.get(sessionId)?.size === 0) {
    clients.delete(sessionId);
  }
}

export async function notifyClients(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return;

  const userTotals = await Promise.all(
    session.users.map(async (user) => ({
      userId: user.id,
      userName: user.name,
      total: await getUserTotal(sessionId, user.id),
    }))
  );

  const data = JSON.stringify({
    type: 'update',
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

  const message = `data: ${data}\n\n`;
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  
  const sessionClients = clients.get(sessionId);
  if (sessionClients) {
    sessionClients.forEach(controller => {
      try {
        controller.enqueue(encodedMessage);
      } catch (error) {
        // Cliente desconectado, removerlo
        sessionClients.delete(controller);
      }
    });
  }
}

export async function getInitialSessionData(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const userTotals = await Promise.all(
    session.users.map(async (user) => ({
      userId: user.id,
      userName: user.name,
      total: await getUserTotal(sessionId, user.id),
    }))
  );

  return {
    type: 'update',
    session: {
      ...session,
      users: session.users.map(u => ({
        ...u,
        joinedAt: u.joinedAt.toISOString(),
      })),
      createdAt: session.createdAt.toISOString(),
    },
    userTotals,
  };
}

