'use client';

import { useState } from 'react';

interface UserAssignmentProps {
  onJoin: (userName: string) => void;
  currentUserName?: string;
}

export default function UserAssignment({ onJoin, currentUserName }: UserAssignmentProps) {
  const [userName, setUserName] = useState(currentUserName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();
    
    if (!trimmedName) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    if (trimmedName.length < 2) {
      alert('El nombre debe tener al menos 2 caracteres');
      return;
    }

    if (trimmedName.length > 50) {
      alert('El nombre es demasiado largo (máximo 50 caracteres)');
      return;
    }

    onJoin(trimmedName);
  };

  if (currentUserName) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <p className="text-gray-700">
          Conectado como: <span className="font-semibold">{currentUserName}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Únete a la Sesión</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
            Tu nombre
          </label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Ingresa tu nombre"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium"
        >
          Unirse
        </button>
      </form>
    </div>
  );
}

