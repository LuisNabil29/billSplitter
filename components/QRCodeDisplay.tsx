'use client';

interface QRCodeDisplayProps {
  qrCodeDataURL: string;
  sessionURL: string;
}

export default function QRCodeDisplay({ qrCodeDataURL, sessionURL }: QRCodeDisplayProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeDataURL;
    link.download = 'qr-code.png';
    link.click();
  };

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(sessionURL);
      alert('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-center text-primary-dark">Compartir Sesión</h3>
      
      <div className="flex flex-col items-center space-y-4">
        <img
          src={qrCodeDataURL}
          alt="QR Code"
          className="w-64 h-64 border-2 border-gray-200 rounded-lg"
        />
        
        <div className="w-full space-y-2">
          <input
            type="text"
            value={sessionURL}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleCopyURL}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              Copiar URL
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm"
            >
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

