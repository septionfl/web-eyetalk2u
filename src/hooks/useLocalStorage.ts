import { useState, useEffect } from 'react';
import { Phrase, AppStorage } from '../types';

export const useLocalStorage = () => {
  const STORAGE_KEY = 'eyetalk2u_data';

  // Get initial data from localStorage
  const getStoredData = (): AppStorage => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
    
    // Return default data structure
    return {
      phrases: [],
      lastUsedCategories: []
    };
  };

  // Save data to localStorage
  const saveStoredData = (data: AppStorage) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return {
    getStoredData,
    saveStoredData
  };
};

// Hook khusus untuk phrases
export const usePhrasesStorage = () => {
  const { getStoredData, saveStoredData } = useLocalStorage();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load phrases from localStorage on component mount
  useEffect(() => {
    loadPhrases();
  }, []);

  const loadPhrases = () => {
    const data = getStoredData();
    // Convert date strings back to Date objects
    const phrasesWithDates = data.phrases.map(phrase => ({
      ...phrase,
      createdAt: new Date(phrase.createdAt)
    }));
    setPhrases(phrasesWithDates);
    setIsLoading(false);
  };

  const savePhrases = (newPhrases: Phrase[]) => {
    setPhrases(newPhrases);
    const data = getStoredData();
    data.phrases = newPhrases;
    saveStoredData(data);
  };

  const addPhrase = (phrase: Omit<Phrase, 'id' | 'createdAt' | 'usageCount'>) => {
    const newPhrase: Phrase = {
      ...phrase,
      id: Date.now().toString(),
      usageCount: 0,
      createdAt: new Date()
    };
    
    const newPhrases = [...phrases, newPhrase];
    savePhrases(newPhrases);
    return newPhrase;
  };

  const updatePhrase = (id: string, updates: Partial<Phrase>) => {
    const newPhrases = phrases.map(phrase =>
      phrase.id === id ? { ...phrase, ...updates } : phrase
    );
    savePhrases(newPhrases);
  };

  const deletePhrase = (id: string) => {
    const newPhrases = phrases.filter(phrase => phrase.id !== id);
    savePhrases(newPhrases);
  };

  const incrementUsage = (id: string) => {
    const phrase = phrases.find(p => p.id === id);
    if (phrase) {
      updatePhrase(id, { usageCount: phrase.usageCount + 1 });
    }
  };

  const getPhrasesByCategory = (category: string) => {
    return phrases.filter(phrase => phrase.category === category);
  };

  const getCategories = () => {
    const categories = [...new Set(phrases.map(phrase => phrase.category))];
    return categories.sort();
  };

  return {
    phrases,
    isLoading,
    addPhrase,
    updatePhrase,
    deletePhrase,
    incrementUsage,
    getPhrasesByCategory,
    getCategories,
    reloadPhrases: loadPhrases
  };
};