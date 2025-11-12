const BASE_URL = 'http://localhost:9001';

export const eyeTrackingApi = {
  startSession: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/start`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Session started successfully');
    } catch (error) {
      console.error('Failed to start session:', error);
      throw new Error('Failed to start eye tracking session');
    }
  },

  stopSession: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/stop`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Session stopped successfully');
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw new Error('Failed to stop eye tracking session');
    }
  },

  calibrate: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/calibrate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Calibration started successfully');
    } catch (error) {
      console.error('Failed to start calibration:', error);
      throw new Error('Failed to start eye tracking calibration');
    }
  },

  resetHaar: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/reset-haar`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Haar cascade reset successfully');
    } catch (error) {
      console.error('Failed to reset Haar cascade:', error);
      throw new Error('Failed to reset Haar cascade');
    }
  },
};