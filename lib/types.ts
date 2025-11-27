export interface ItemAssignment {
  userId: string;
  quantity: number;
}

export interface BillItem {
  id: string;
  name: string;
  price: number; // Precio unitario
  quantity: number; // Cantidad total del item
  assignments: ItemAssignment[]; // Asignaciones por usuario
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

