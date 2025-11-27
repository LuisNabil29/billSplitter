import { NextRequest } from 'next/server';
import { addClient, removeClient, getInitialSessionData } from '@/lib/sse-notifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const stream = new ReadableStream({
    start(controller) {
      // Agregar cliente a la lista
      addClient(id, controller);

      // Enviar estado inicial
      const initialData = getInitialSessionData(id);
      if (initialData) {
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`);
      }

      // Limpiar cuando el cliente se desconecta
      request.signal.addEventListener('abort', () => {
        removeClient(id, controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

