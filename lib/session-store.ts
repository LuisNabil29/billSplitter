import { Session, BillItem, User, ItemAssignment } from './types';
import { v4 as uuidv4 } from 'uuid';

// Store en memoria para sesiones
const sessions = new Map<string, Session>();

export function createSession(imageUrl?: string): Session {
  const session: Session = {
    id: uuidv4(),
    createdAt: new Date(),
    items: [],
    users: [],
    imageUrl,
  };
  
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, updates: Partial<Session>): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const updatedSession = { ...session, ...updates };
  sessions.set(sessionId, updatedSession);
  return updatedSession;
}

export function addItemsToSession(sessionId: string, items: Omit<BillItem, 'id' | 'assignments'>[]): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const newItems: BillItem[] = items.map(item => ({
    ...item,
    id: uuidv4(),
    assignments: [],
  }));
  
  session.items.push(...newItems);
  sessions.set(sessionId, session);
  return session;
}

export function addUserToSession(sessionId: string, userName: string): { session: Session; user: User } | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const user: User = {
    id: uuidv4(),
    name: userName,
    joinedAt: new Date(),
  };
  
  session.users.push(user);
  sessions.set(sessionId, session);
  return { session, user };
}

export function assignItemQuantityToUser(
  sessionId: string,
  itemId: string,
  userId: string,
  quantity: number
): Session | null {
  const session = sessions.get(sessionId);
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
  
  sessions.set(sessionId, session);
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

export function getUserTotal(sessionId: string, userId: string): number {
  const session = sessions.get(sessionId);
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

export function getAllSessionIds(): string[] {
  return Array.from(sessions.keys());
}

