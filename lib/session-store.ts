import { Session, BillItem, User, ItemAssignment } from './types';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

// Conectar a Redis usando la URL de RedisLabs
const redis = new Redis(process.env.REDIS_URL || '');

// TTL para sesiones: 24 horas en segundos
const SESSION_TTL = 24 * 60 * 60;

// Helper para obtener la clave de Redis
function getSessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

export async function createSession(imageUrl?: string): Promise<Session> {
  const session: Session = {
    id: uuidv4(),
    createdAt: new Date(),
    items: [],
    users: [],
    imageUrl,
  };
  
  await redis.set(getSessionKey(session.id), JSON.stringify(session), 'EX', SESSION_TTL);
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const data = await redis.get(getSessionKey(sessionId));
  if (!data) return null;
  
  const session = JSON.parse(data);
  // Convertir strings de fecha de vuelta a objetos Date
  session.createdAt = new Date(session.createdAt);
  session.users = session.users.map((u: any) => ({
    ...u,
    joinedAt: new Date(u.joinedAt),
  }));
  return session;
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  
  const updatedSession = { ...session, ...updates };
  await redis.set(getSessionKey(sessionId), JSON.stringify(updatedSession), 'EX', SESSION_TTL);
  return updatedSession;
}

export async function addItemsToSession(sessionId: string, items: Omit<BillItem, 'id' | 'assignments'>[]): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  
  const newItems: BillItem[] = items.map(item => ({
    ...item,
    id: uuidv4(),
    assignments: [],
  }));
  
  session.items.push(...newItems);
  await redis.set(getSessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
  return session;
}

export async function addUserToSession(sessionId: string, userName: string): Promise<{ session: Session; user: User } | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  
  const user: User = {
    id: uuidv4(),
    name: userName,
    joinedAt: new Date(),
  };
  
  session.users.push(user);
  await redis.set(getSessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
  return { session, user };
}

export async function assignItemQuantityToUser(
  sessionId: string,
  itemId: string,
  userId: string,
  quantity: number
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  
  const item = session.items.find(i => i.id === itemId);
  if (!item) return null;
  
  // Calcular cantidad ya asignada (excluyendo este usuario)
  const assignedQuantity = item.assignments
    .filter(a => a.userId !== userId)
    .reduce((sum, a) => sum + a.quantity, 0);
  
  const availableQuantity = item.quantity - assignedQuantity;
  
  // Validar que la cantidad solicitada no exceda lo disponible
  if (quantity < 0) {
    quantity = 0;
  }
  // Permitir fracciones, pero validar que no exceda lo disponible
  if (quantity > availableQuantity + 0.001) { // Pequeño margen para errores de punto flotante
    quantity = Math.min(quantity, availableQuantity);
  }
  
  // Encontrar o crear asignación para este usuario
  const existingAssignment = item.assignments.find(a => a.userId === userId);
  
  if (quantity === 0) {
    // Remover asignación si la cantidad es 0
    item.assignments = item.assignments.filter(a => a.userId !== userId);
  } else {
    if (existingAssignment) {
      existingAssignment.quantity = quantity;
    } else {
      item.assignments.push({ userId, quantity });
    }
  }
  
  await redis.set(getSessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
  return session;
}

export function getItemAssignedQuantity(item: BillItem, userId: string): number {
  const assignment = item.assignments.find(a => a.userId === userId);
  return assignment ? assignment.quantity : 0;
}

export function getItemAvailableQuantity(item: BillItem): number {
  const assignedQuantity = item.assignments.reduce((sum, a) => sum + a.quantity, 0);
  return item.quantity - assignedQuantity;
}

export async function getUserTotal(sessionId: string, userId: string): Promise<number> {
  const session = await getSession(sessionId);
  if (!session) return 0;
  
  return session.items.reduce((total, item) => {
    const assignment = item.assignments.find(a => a.userId === userId);
    if (assignment) {
      // Precio unitario * cantidad asignada
      return total + (item.price * assignment.quantity);
    }
    return total;
  }, 0);
}

export async function getAllSessionIds(): Promise<string[]> {
  // En Redis, listar todas las claves con patrón session:*
  const keys = await redis.keys('session:*');
  return keys.map(key => key.replace('session:', ''));
}

