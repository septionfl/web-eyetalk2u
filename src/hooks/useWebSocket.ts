import { useState, useEffect, useRef } from 'react';

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

export const useWebSocket = (url: string = 'ws://localhost:9001/mapping') => {
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket mapping connected to:', url);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different data formats from backend
          let x: number, y: number;
          
          if (typeof data.x === 'number' && typeof data.y === 'number') {
            // Format: { x: number, y: number }
            x = data.x;
            y = data.y;
          } else if (data.coordinates && typeof data.coordinates.x === 'number' && typeof data.coordinates.y === 'number') {
            // Format: { coordinates: { x: number, y: number } }
            x = data.coordinates.x;
            y = data.coordinates.y;
          } else if (Array.isArray(data) && data.length >= 2) {
            // Format: [x, y]
            x = data[0];
            y = data[1];
          } else {
            console.warn('Unknown data format from WebSocket:', data);
            return;
          }

          // Normalize coordinates to 0-100 range if needed
          const normalizedX = Math.max(0, Math.min(100, x));
          const normalizedY = Math.max(0, Math.min(100, y));
          
          setGazeData({
            x: normalizedX,
            y: normalizedY,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket mapping disconnected:', event.code, event.reason);
        
        // Attempt reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket mapping error:', error);
        setError('Failed to connect to eye tracking server');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { gazeData, isConnected, error, sendMessage };
};