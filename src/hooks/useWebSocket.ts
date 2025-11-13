import { useState, useEffect, useRef } from "react";

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

export const useWebSocket = (url: string = "ws://localhost:9001/mapping") => {
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const connect = () => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("WebSocket mapping connected to:", url);
      };

      ws.current.onmessage = (event) => {
        try {
          // Backend sends comma-separated string like "x,y" (e.g., "960,540")
          // Reference: event.data.split(",").map(parseFloat)
          const dataStr = event.data;

          // Try to parse as comma-separated string first (primary format)
          if (typeof dataStr === "string" && dataStr.includes(",")) {
            const [x, y] = dataStr.split(",").map(parseFloat);

            if (!isNaN(x) && !isNaN(y)) {
              // Coordinates are in absolute pixels (typically 1920x1080 screen)
              // Store raw coordinates for proper normalization in component
              setGazeData({
                x: x,
                y: y,
                timestamp: Date.now(),
              });
              return;
            }
          }

          // Fallback: Try JSON parsing for other formats
          try {
            const data = JSON.parse(dataStr);
            let x: number, y: number;

            if (typeof data.x === "number" && typeof data.y === "number") {
              x = data.x;
              y = data.y;
            } else if (
              data.coordinates &&
              typeof data.coordinates.x === "number" &&
              typeof data.coordinates.y === "number"
            ) {
              x = data.coordinates.x;
              y = data.coordinates.y;
            } else if (Array.isArray(data) && data.length >= 2) {
              x = data[0];
              y = data[1];
            } else {
              console.warn("Unknown data format from WebSocket:", data);
              return;
            }

            setGazeData({
              x: x,
              y: y,
              timestamp: Date.now(),
            });
          } catch (jsonError) {
            console.error(
              "Error parsing WebSocket message:",
              jsonError,
              event.data
            );
          }
        } catch (error) {
          console.error(
            "Error processing WebSocket message:",
            error,
            event.data
          );
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log(
          "WebSocket mapping disconnected:",
          event.code,
          event.reason
        );

        // Attempt reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket mapping error:", error);
        setError("Failed to connect to eye tracking server");
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setError("Failed to create WebSocket connection");
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
