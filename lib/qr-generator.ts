import QRCode from 'qrcode';

/**
 * Genera un código QR como data URL (para mostrar en img src)
 */
export async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Error al generar código QR');
  }
}

/**
 * Genera un código QR como SVG string
 */
export async function generateQRCodeSVG(url: string): Promise<string> {
  try {
    return await QRCode.toString(url, {
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Error al generar código QR');
  }
}

/**
 * Genera la URL completa de una sesión
 */
export function getSessionURL(sessionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/${sessionId}`;
}

