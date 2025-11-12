// Mock WebSocket for development and testing
export class MockWebSocket {
  private static instance: MockWebSocket;
  private listeners: { [key: string]: Function[] } = {};
  public readyState = 1; // OPEN
  public url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instance = this;
    console.log('Mock WebSocket connected to:', url);
    
    // Start simulating gaze data
    this.simulateGazeData();
  }

  onopen = () => {};
  onmessage = (event: any) => {};
  onclose = () => {};
  onerror = (error: any) => {};

  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  send(data: string) {
    console.log('WebSocket send:', data);
    const message = JSON.parse(data);
    
    // Handle different message types
    switch (message.type) {
      case 'start_voice_session':
        this.simulateMessage({
          type: 'voice_session_started',
          data: { 
            timestamp: Date.now(),
            message: 'Voice session started successfully'
          }
        });
        break;
        
      case 'stop_voice_session':
        this.simulateMessage({
          type: 'voice_session_stopped',
          data: { 
            timestamp: Date.now(),
            message: 'Voice session stopped'
          }
        });
        break;
        
      case 'start_calibration':
        this.simulateMessage({
          type: 'calibration_started',
          data: { timestamp: Date.now() }
        });
        
        // Simulate calibration completion
        setTimeout(() => {
          this.simulateMessage({
            type: 'calibration_complete',
            data: { 
              timestamp: Date.now(),
              accuracy: 0.95,
              message: 'Calibration completed successfully'
            }
          });
        }, 3000);
        break;
        
      case 'request_gaze_data':
        this.simulateMessage({
          type: 'gaze_data_started',
          data: { timestamp: Date.now() }
        });
        break;
        
      case 'button_triggered':
        console.log('Button triggered in mock:', message.data);
        // Echo back for confirmation
        this.simulateMessage({
          type: 'button_trigger_confirmed',
          data: {
            ...message.data,
            confirmed: true,
            serverTimestamp: Date.now()
          }
        });
        break;
        
      default:
        console.log('Unhandled message type in mock:', message.type);
    }
  }

  close() {
    this.readyState = 3; // CLOSED
    this.simulateMessage({ type: 'connection_closed', data: {} });
  }

  private simulateMessage(message: any) {
    if (this.listeners['message']) {
      this.listeners['message'].forEach(callback => 
        callback({ data: JSON.stringify(message) })
      );
    }
  }

  private simulateGazeData() {
    // Simulate realistic gaze data moving between buttons
    let x = 50, y = 50;
    let targetX = 25, targetY = 30;
    let step = 0;
    
    const updateGaze = () => {
      if (this.readyState !== 1) return;

      // Move towards target
      x += (targetX - x) * 0.1;
      y += (targetY - y) * 0.1;
      
      // If close to target, pick new target
      if (Math.abs(x - targetX) < 2 && Math.abs(y - targetY) < 2) {
        step = (step + 1) % 4;
        const targets = [
          { x: 25, y: 30 }, // Thirsty
          { x: 75, y: 30 }, // Hungry
          { x: 25, y: 70 }, // Help
          { x: 75, y: 70 }  // Pain
        ];
        targetX = targets[step].x;
        targetY = targets[step].y;
      }

      // Add some random noise to simulate real gaze data
      const noiseX = (Math.random() - 0.5) * 4;
      const noiseY = (Math.random() - 0.5) * 4;
      
      this.simulateMessage({
        type: 'gaze_data',
        data: {
          x: x + noiseX,
          y: y + noiseY,
          timestamp: Date.now(),
          confidence: 0.8 + Math.random() * 0.2
        }
      });

      setTimeout(updateGaze, 100); // ~10 FPS
    };

    updateGaze();
  }

  // Static method to get instance
  static getInstance(): MockWebSocket {
    return MockWebSocket.instance;
  }
}

// Replace global WebSocket with mock in development
if (import.meta.env.DEV) {
  (window as any).WebSocket = MockWebSocket;
}