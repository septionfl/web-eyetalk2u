export const BASE_URL = "http://localhost:9001";

export const eyeTrackingApi = {
  startSession: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/start`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Session started successfully");
    } catch (error) {
      console.error("Failed to start session:", error);
      throw new Error("Failed to start eye tracking session");
    }
  },

  stopSession: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/stop`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Session stopped successfully");
    } catch (error) {
      console.error("Failed to stop session:", error);
      throw new Error("Failed to stop eye tracking session");
    }
  },

  calibrate: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/calibrate`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Calibration started successfully");
    } catch (error) {
      console.error("Failed to start calibration:", error);
      throw new Error("Failed to start eye tracking calibration");
    }
  },

  resetHaar: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/reset-haar`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Haar cascade reset successfully");
    } catch (error) {
      console.error("Failed to reset Haar cascade:", error);
      throw new Error("Failed to reset Haar cascade");
    }
  },

  checkSessionStatus: async (): Promise<boolean> => {
    try {
      // Try to check if session is active by calling a status endpoint
      // If backend doesn't have status endpoint, we'll use localStorage as fallback
      const response = await fetch(`${BASE_URL}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.active === true || data.status === "active";
      }
      return false;
    } catch (error) {
      // Fallback to localStorage if backend doesn't have status endpoint
      const stored = localStorage.getItem("session_active");
      return stored === "true";
    }
  },

  setCameraIndex: async (camIndex: number): Promise<string> => {
    try {
      const response = await fetch(
        `${BASE_URL}/camera/cam?cam=${encodeURIComponent(camIndex)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Camera index set successfully");
      return responseText;
    } catch (error) {
      console.error("Failed to set camera index:", error);
      throw new Error("Failed to set camera index");
    }
  },

  setCameraLink: async (link: string): Promise<string> => {
    try {
      const response = await fetch(
        `${BASE_URL}/camera/link?link=${encodeURIComponent(link)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Camera link set successfully");
      return responseText;
    } catch (error) {
      console.error("Failed to set camera link:", error);
      throw new Error("Failed to set camera link");
    }
  },
};
