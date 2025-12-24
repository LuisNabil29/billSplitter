export interface ItemAssignment {
  userId: string;
  quantity: number;
}

export interface ItemVerificationIssue {
  type: 'unit_price_mismatch' | 'sum_mismatch' | 'suspicious_quantity';
  message: string;
  suggestedFix?: {
    price?: number;
    quantity?: number;
  };
}

export interface BillItem {
  id: string;
  name: string;
  price: number; // Precio unitario
  quantity: number; // Cantidad total del item
  assignments: ItemAssignment[]; // Asignaciones por usuario
  verificationIssue?: ItemVerificationIssue; // Nuevo campo opcional para marcar problemas
}

export interface User {
  id: string;
  name: string;
  joinedAt: Date;
}

export interface Session {
  id: string;
  createdAt: Date;
  items: BillItem[];
  users: User[];
  imageUrl?: string;
}

