'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/ImageUpload';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import BillItemsList from '@/components/BillItemsList';
import TotalDisplay from '@/components/TotalDisplay';
import { BillItem } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionURL, setSessionURL] = useState<string | null>(null);
  const [userTotals, setUserTotals] = useState<Array<{ userId: string; userName: string; total: number }>>([]);

  const handleImageUploaded = async (imageBase64: string, mimeType: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageBase64', imageBase64);
      formData.append('imageMimeType', mimeType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la imagen');
      }

      setSessionId(data.sessionId);
      setItems(data.items);
      setQrCode(data.qrCode);
      setSessionURL(data.sessionURL);
      setUserTotals([]);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la imagen');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemEdit = async (itemId: string, updates: { name?: string; price?: number; quantity?: number }) => {
    if (!sessionId) return;

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

    // Actualizar localmente primero para mejor UX
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, ...updates }
          : item
      )
    );

    // TODO: Enviar actualización al servidor si es necesario
    // Por ahora solo actualizamos localmente ya que el estado está en memoria del servidor
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-dark">
            Bill Splitter
          </h1>
          <p className="text-sm text-gray-500 mt-2">By Luis Nabil</p>
        </div>
        <p className="text-center text-gray-700 mb-8">
          Sube una imagen de tu cuenta y divide los gastos fácilmente
        </p>

        {!sessionId ? (
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <ImageUpload onImageUploaded={handleImageUploaded} disabled={loading} />
            
            {loading && (
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-700">Procesando imagen con OCR...</p>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="font-semibold">Error al procesar la imagen</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setSessionId(null);
                    setItems([]);
                    setQrCode(null);
                    setSessionURL(null);
                  }}
                  className="mt-3 px-4 py-2 bg-primary-dark text-white rounded-md hover:bg-primary transition-colors text-sm"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mensaje de verificación después de cargar imagen */}
            <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    ⚠️ Verificación Importante
                  </p>
                  <p className="text-sm text-amber-700">
                    Por favor <strong>verifica que el total calculado (${total.toFixed(2)}) sea igual al de tu ticket</strong>. 
                    En caso de diferencias, revisa y/o ajusta las partidas usando el botón "Editar" en cada item.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Items de la Cuenta</h2>
                <BillItemsList
                  items={items}
                  onItemEdit={handleItemEdit}
                  editable={true}
                  showEditButton={true}
                />
              </div>

              <div className="space-y-6">
                <QRCodeDisplay qrCodeDataURL={qrCode!} sessionURL={sessionURL!} />
                <TotalDisplay userTotals={userTotals} itemsTotal={total} />
              </div>
            </div>

            <div className="bg-accent-light/20 border border-accent rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-dark mb-1">
                    Comparte esta sesión
                  </p>
                  <p className="text-sm text-gray-700">
                    Escanea el código QR o comparte la URL para que otros se unan y asignen items de la cuenta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
