import { useState, useEffect } from 'react';

export interface VoiceButton {
  id: string;
  label: string;
  audioUrl: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  dwellTime: number;
}

const STORAGE_KEY = 'eyetalk2u_voice_buttons';

const defaultVoiceButtons: VoiceButton[] = [
  {
    id: 'thirsty',
    label: 'Saya Haus',
    audioUrl: '/audio/saya_haus.wav',
    centerX: 25,
    centerY: 30,
    radius: 12,
    color: '#3B82F6',
    dwellTime: 2000
  },
  {
    id: 'hungry',
    label: 'Saya Lapar',
    audioUrl: '/audio/saya_lapar.wav',
    centerX: 75,
    centerY: 30,
    radius: 12,
    color: '#10B981',
    dwellTime: 2000
  },
  {
    id: 'help',
    label: 'Tolong',
    audioUrl: '/audio/tolong.wav',
    centerX: 25,
    centerY: 70,
    radius: 10,
    color: '#EF4444',
    dwellTime: 1500
  },
  {
    id: 'pain',
    label: 'Sakit',
    audioUrl: '/audio/sakit.wav',
    centerX: 75,
    centerY: 70,
    radius: 10,
    color: '#F59E0B',
    dwellTime: 1500
  }
];

export const useVoiceButtons = () => {
  const [voiceButtons, setVoiceButtons] = useState<VoiceButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedButtons = JSON.parse(stored);
        setVoiceButtons(parsedButtons);
      } else {
        // Initialize with default buttons
        setVoiceButtons(defaultVoiceButtons);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultVoiceButtons));
      }
    } catch (error) {
      console.error('Error loading voice buttons:', error);
      setVoiceButtons(defaultVoiceButtons);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever voiceButtons change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(voiceButtons));
    }
  }, [voiceButtons, isLoading]);

  const addVoiceButton = (button: Omit<VoiceButton, 'id'>) => {
    const newButton: VoiceButton = {
      ...button,
      id: `button_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setVoiceButtons(prev => [...prev, newButton]);
    return newButton.id;
  };

  const updateVoiceButton = (id: string, updates: Partial<VoiceButton>) => {
    setVoiceButtons(prev =>
      prev.map(button =>
        button.id === id ? { ...button, ...updates } : button
      )
    );
  };

  const deleteVoiceButton = (id: string) => {
    setVoiceButtons(prev => prev.filter(button => button.id !== id));
  };

  const resetToDefaults = () => {
    setVoiceButtons(defaultVoiceButtons);
  };

  const importVoiceButtons = (buttons: VoiceButton[]) => {
    setVoiceButtons(buttons);
  };

  const exportVoiceButtons = () => {
    return JSON.stringify(voiceButtons, null, 2);
  };

  return {
    voiceButtons,
    isLoading,
    addVoiceButton,
    updateVoiceButton,
    deleteVoiceButton,
    resetToDefaults,
    importVoiceButtons,
    exportVoiceButtons
  };
};