'use client';

interface UserTotal {
  userId: string;
  userName: string;
  total: number;
}

interface TotalDisplayProps {
  userTotals: UserTotal[];
  itemsTotal: number;
}

export default function TotalDisplay({ userTotals, itemsTotal }: TotalDisplayProps) {
  const allAssigned = userTotals.length > 0 && userTotals.every(ut => ut.total > 0);
  const unassignedTotal = userTotals.reduce((sum, ut) => sum + ut.total, 0);
  const remaining = itemsTotal - unassignedTotal;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-xl font-bold mb-4 text-primary-dark">Resumen de Pagos</h3>
      
      <div className="space-y-3 mb-4">
        {userTotals.map((userTotal) => (
          <div
            key={userTotal.userId}
            className="flex justify-between items-center p-3 bg-accent-light/10 rounded-lg border border-accent-peach/30"
          >
            <span className="font-medium text-gray-900">{userTotal.userName}</span>
            <span className="text-lg font-semibold text-gray-900">
              ${userTotal.total.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total asignado:</span>
          <span>${unassignedTotal.toFixed(2)}</span>
        </div>
        {remaining > 0 && (
          <div className="flex justify-between text-sm text-primary font-medium">
            <span>Pendiente de asignar:</span>
            <span>${remaining.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
          <span>Total de la cuenta:</span>
          <span>${itemsTotal.toFixed(2)}</span>
        </div>
      </div>

      {allAssigned && remaining === 0 && (
        <div className="mt-4 p-3 bg-accent-light/30 border border-accent text-primary-dark rounded-lg text-sm">
          ✓ Todos los items han sido asignados
        </div>
      )}
    </div>
  );
}

