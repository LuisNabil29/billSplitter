import { BillItem } from './types';

// Funciones helper que NO necesitan Redis y pueden usarse en el cliente
export function getItemAssignedQuantity(item: BillItem, userId: string): number {
  const assignment = item.assignments.find(a => a.userId === userId);
  return assignment ? assignment.quantity : 0;
}

export function getItemAvailableQuantity(item: BillItem): number {
  const assignedQuantity = item.assignments.reduce((sum, a) => sum + a.quantity, 0);
  return item.quantity - assignedQuantity;
}

