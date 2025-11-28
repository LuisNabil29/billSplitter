'use client';

import { useState } from 'react';
import { BillItem } from '@/lib/types';
import { getItemAssignedQuantity, getItemAvailableQuantity } from '@/lib/session-helpers';

interface BillItemsListProps {
  items: BillItem[];
  onItemEdit: (itemId: string, updates: { name?: string; price?: number; quantity?: number }) => void;
  onItemQuantityAssign?: (itemId: string, quantity: number) => void;
  currentUserId?: string;
  editable?: boolean;
}

export default function BillItemsList({
  items,
  onItemEdit,
  onItemQuantityAssign,
  currentUserId,
  editable = true,
}: BillItemsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignQuantity, setAssignQuantity] = useState('');
  const [dividingId, setDividingId] = useState<string | null>(null);
  const [divideBy, setDivideBy] = useState('2');

  const handleStartEdit = (item: BillItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toFixed(2));
    setEditQuantity(item.quantity.toString());
  };

  const handleSaveEdit = (itemId: string) => {
    if (!editName.trim()) {
      alert('El nombre del item no puede estar vacío');
      return;
    }

    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 1) {
      alert('La cantidad debe ser un número válido mayor a 0');
      return;
    }
    
    onItemEdit(itemId, {
      name: editName.trim(),
      price,
      quantity,
    });
    
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleStartAssign = (item: BillItem) => {
    setAssigningId(item.id);
    const currentQty = getItemAssignedQuantity(item, currentUserId || '');
    setAssignQuantity(currentQty > 0 ? currentQty.toString() : '');
  };

  const handleSaveAssign = (itemId: string) => {
    const quantity = parseFloat(assignQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert('La cantidad debe ser un número válido mayor o igual a 0');
      return;
    }

    if (onItemQuantityAssign) {
      onItemQuantityAssign(itemId, quantity);
    }
    
    setAssigningId(null);
    setAssignQuantity('');
  };

  const handleCancelAssign = () => {
    setAssigningId(null);
    setAssignQuantity('');
  };

  const handleQuickAssign = (item: BillItem) => {
    if (!onItemQuantityAssign || !currentUserId) return;

    const currentQty = getItemAssignedQuantity(item, currentUserId);
    const availableQty = getItemAvailableQuantity(item) + currentQty;
    
    // Incrementar en 1, pero no más de lo disponible
    const newQty = Math.min(currentQty + 1, availableQty);
    
    onItemQuantityAssign(item.id, newQty);
  };

  const handleFractionAssign = (item: BillItem, fraction: number) => {
    if (!onItemQuantityAssign || !currentUserId) return;

    const currentQty = getItemAssignedQuantity(item, currentUserId);
    const availableQty = getItemAvailableQuantity(item) + currentQty;
    
    // Calcular nueva cantidad sumando la fracción
    let newQty = currentQty + fraction;
    
    // Redondear a 2 decimales para evitar errores de punto flotante
    newQty = Math.round(newQty * 100) / 100;
    
    // Validar que no exceda lo disponible
    if (newQty <= availableQty && newQty >= 0) {
      onItemQuantityAssign(item.id, newQty);
    }
  };

  const handleStartDivide = (item: BillItem) => {
    setDividingId(item.id);
    setDivideBy('2'); // Default: dividir entre 2
  };

  const handleCancelDivide = () => {
    setDividingId(null);
    setDivideBy('2');
  };

  const handleApplyDivision = (item: BillItem) => {
    if (!onItemQuantityAssign || !currentUserId) return;

    const divider = parseInt(divideBy);
    if (isNaN(divider) || divider < 1) {
      alert('El número de personas debe ser un valor válido mayor a 0');
      return;
    }

    const currentQty = getItemAssignedQuantity(item, currentUserId);
    const availableQty = getItemAvailableQuantity(item) + currentQty;
    
    // Calcular la fracción (1/divider)
    const fraction = 1 / divider;
    let newQty = currentQty + fraction;
    
    // Redondear a 2 decimales para evitar errores de punto flotante
    newQty = Math.round(newQty * 100) / 100;
    
    // Validar que no exceda lo disponible
    if (newQty <= availableQty && newQty >= 0) {
      onItemQuantityAssign(item.id, newQty);
      setDividingId(null);
      setDivideBy('2');
    } else {
      alert('No hay suficiente cantidad disponible');
    }
  };

  const handleRemoveAssignment = (item: BillItem) => {
    if (!onItemQuantityAssign || !currentUserId) return;
    onItemQuantityAssign(item.id, 0);
  };

  const getCurrentUserQuantity = (item: BillItem) => {
    if (!currentUserId) return 0;
    return getItemAssignedQuantity(item, currentUserId);
  };

  const getAvailableQuantity = (item: BillItem) => {
    return getItemAvailableQuantity(item);
  };

  const getTotalPrice = (item: BillItem) => {
    return item.price * item.quantity;
  };

  const formatQuantity = (qty: number): string => {
    if (qty === 0) return '0';
    if (qty % 1 === 0) return qty.toString();
    // Mostrar fracciones comunes de forma amigable
    if (qty === 0.5) return '½';
    if (qty === 0.25) return '¼';
    if (qty === 0.75) return '¾';
    if (qty === 0.33) return '⅓';
    if (qty === 0.67) return '⅔';
    return qty.toFixed(2);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay items en la cuenta
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const currentUserQty = getCurrentUserQuantity(item);
        const availableQty = getAvailableQuantity(item);
        const hasAssignments = item.assignments.length > 0;

        return (
          <div
            key={item.id}
            className={`
              p-4 rounded-lg border-2 transition-all
              ${
                currentUserQty > 0
                  ? 'border-primary bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg shadow-primary/30'
                  : hasAssignments
                  ? 'border-primary-light/30 bg-accent-light/10'
                  : 'border-gray-200 bg-white hover:border-primary-light'
              }
            `}
          >
            {editingId === item.id && editable ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nombre del item"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Precio unit."
                  />
                  <input
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Cantidad"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : assigningId === item.id && editable && onItemQuantityAssign ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className={`flex-1 font-medium ${currentUserQty > 0 ? 'text-white' : 'text-gray-900'}`}>
                    {item.name}
                  </span>
                  <span className={`text-sm ${currentUserQty > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                    Disponible: {availableQty + currentUserQty}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={availableQty + currentUserQty}
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Cantidad"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveAssign(item.id)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelAssign}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium ${currentUserQty > 0 ? 'text-white' : 'text-gray-900'}`}>
                      {item.name}
                      {item.quantity > 1 && (
                        <span className={`ml-2 text-sm font-normal ${currentUserQty > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                          (x{item.quantity})
                        </span>
                      )}
                    </div>
                    <div className={`text-sm mt-1 ${currentUserQty > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                      ${item.price.toFixed(2)} c/u • Total: ${getTotalPrice(item).toFixed(2)}
                    </div>
                    {hasAssignments && (
                      <div className={`text-xs mt-1 ${currentUserQty > 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.assignments.map((assignment, idx) => (
                          <span key={assignment.userId}>
                            {idx > 0 && ', '}
                            {formatQuantity(assignment.quantity)} asignado{assignment.quantity !== 1 ? 's' : ''}
                          </span>
                        ))}
                        {availableQty > 0 && ` • ${formatQuantity(availableQty)} disponible${availableQty !== 1 ? 's' : ''}`}
                      </div>
                    )}
                    {currentUserQty > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-sm font-bold text-accent-light bg-primary-dark/40 px-3 py-2 rounded-md border border-primary/60 shadow-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Tú tienes: {formatQuantity(currentUserQty)} (${(item.price * currentUserQty).toFixed(2)})</span>
                      </div>
                    )}
                  </div>
                  {editable && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className={`px-3 py-1 rounded-md text-xs transition-colors ${
                          currentUserQty > 0
                            ? 'bg-slate-600 text-white hover:bg-slate-500'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                {/* Botones de asignación */}
                {editable && onItemQuantityAssign && currentUserId && (
                  <div className={`flex flex-wrap gap-2 pt-2 border-t ${currentUserQty > 0 ? 'border-gray-600' : 'border-gray-200'}`}>
                    {item.quantity === 1 ? (
                      <>
                        {/* Interfaz para dividir entre N personas */}
                        {dividingId === item.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className={`text-xs ${currentUserQty > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                              Dividir entre:
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={divideBy}
                              onChange={(e) => setDivideBy(e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              placeholder="N"
                            />
                            <span className={`text-xs ${currentUserQty > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                              personas
                            </span>
                            <button
                              onClick={() => handleApplyDivision(item)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                currentUserQty > 0
                                  ? 'bg-primary text-white hover:bg-primary-dark'
                                  : 'bg-primary text-white hover:bg-primary-dark'
                              }`}
                            >
                              Aplicar
                            </button>
                            <button
                              onClick={handleCancelDivide}
                              className="px-3 py-1.5 bg-gray-400 text-white rounded-md hover:bg-gray-500 text-sm font-medium transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartDivide(item)}
                              disabled={availableQty < 0.01}
                              className={`px-3 py-1.5 rounded-md hover:bg-accent-light/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors ${
                                currentUserQty > 0
                                  ? 'bg-accent text-white hover:bg-accent-light hover:text-primary-dark'
                                  : 'bg-accent-light/30 text-primary-dark'
                              }`}
                              title="Dividir entre N personas"
                            >
                              Dividir entre...
                            </button>
                            <button
                              onClick={() => handleQuickAssign(item)}
                              disabled={availableQty < 1}
                              className={`px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors ${
                                currentUserQty > 0
                                  ? 'bg-primary text-white hover:bg-primary-light'
                                  : 'bg-primary text-white hover:bg-primary-dark'
                              }`}
                              title="Asignar 1 unidad completa"
                            >
                              +1
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Botón de incremento rápido para items con múltiples unidades */}
                        <button
                          onClick={() => handleQuickAssign(item)}
                          disabled={availableQty < 1}
                          className={`px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors ${
                            currentUserQty > 0
                              ? 'bg-primary text-white hover:bg-primary-light'
                              : 'bg-primary text-white hover:bg-primary-dark'
                          }`}
                        >
                          {currentUserQty > 0 ? `+1 (Tienes ${formatQuantity(currentUserQty)})` : 'Asignar 1'}
                        </button>
                      </>
                    )}
                    
                    {/* Botón para quitar asignación */}
                    {currentUserQty > 0 && (
                      <button
                        onClick={() => handleRemoveAssignment(item)}
                        className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 font-medium transition-colors"
                      >
                        Quitar ({formatQuantity(currentUserQty)})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
