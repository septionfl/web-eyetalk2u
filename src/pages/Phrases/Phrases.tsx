import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload } from 'lucide-react';
import { Phrase } from '../../types';
import './Phrases.css';

const Phrases: React.FC = () => {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [filteredPhrases, setFilteredPhrases] = useState<Phrase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);

  useEffect(() => {
    // Mock data
    const mockPhrases: Phrase[] = [
      {
        id: '1',
        text: 'Saya haus',
        category: 'kebutuhan_dasar',
        usageCount: 45,
        createdAt: new Date('2024-01-15')
      },
      {
        id: '2',
        text: 'Saya lapar',
        category: 'kebutuhan_dasar',
        usageCount: 32,
        createdAt: new Date('2024-01-16')
      },
      {
        id: '3',
        text: 'Tolong panggil perawat',
        category: 'bantuan',
        usageCount: 28,
        createdAt: new Date('2024-01-17')
      }
    ];
    setPhrases(mockPhrases);
    setFilteredPhrases(mockPhrases);
  }, []);

  useEffect(() => {
    const filtered = phrases.filter(phrase =>
      phrase.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phrase.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPhrases(filtered);
  }, [searchTerm, phrases]);

  const handleSavePhrase = (phraseData: Omit<Phrase, 'id' | 'createdAt' | 'usageCount'>) => {
    if (editingPhrase) {
      setPhrases(phrases.map(p => 
        p.id === editingPhrase.id 
          ? { ...p, ...phraseData }
          : p
      ));
    } else {
      const newPhrase: Phrase = {
        ...phraseData,
        id: Date.now().toString(),
        usageCount: 0,
        createdAt: new Date()
      };
      setPhrases([...phrases, newPhrase]);
    }
    setIsModalOpen(false);
    setEditingPhrase(null);
  };

  const handleDelete = (id: string) => {
    setPhrases(phrases.filter(p => p.id !== id));
  };

  const handleDeploy = () => {
    // Send phrases to devices
    console.log('Deploying phrases to devices...');
  };

  return (
    <div className="phrases-page">
      <div className="page-header">
        <h1>Phrase Management</h1>
        <div className="header-actions">
          <button className="btn secondary" onClick={handleDeploy}>
            <Download size={16} />
            Deploy to Devices
          </button>
          <button 
            className="btn primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            Add Phrase
          </button>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search phrases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">Basic Needs</button>
          <button className="filter-btn">Medical</button>
          <button className="filter-btn">Comfort</button>
        </div>
      </div>

      <div className="phrases-table-container">
        <table className="phrases-table">
          <thead>
            <tr>
              <th>Phrase</th>
              <th>Category</th>
              <th>Usage Count</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPhrases.map((phrase) => (
              <tr key={phrase.id}>
                <td>{phrase.text}</td>
                <td>
                  <span className="category-tag">{phrase.category}</span>
                </td>
                <td>{phrase.usageCount}</td>
                <td>{phrase.createdAt.toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setEditingPhrase(phrase);
                        setIsModalOpen(true);
                      }}
                      className="action-btn edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(phrase.id)}
                      className="action-btn delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <PhraseModal
          phrase={editingPhrase}
          onSave={handleSavePhrase}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPhrase(null);
          }}
        />
      )}
    </div>
  );
};

// Phrase Modal Component
const PhraseModal: React.FC<{
  phrase: Phrase | null;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ phrase, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    text: phrase?.text || '',
    category: phrase?.category || 'kebutuhan_dasar'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.text.trim()) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{phrase ? 'Edit Phrase' : 'Add New Phrase'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phrase Text</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Enter phrase text..."
              required
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="kebutuhan_dasar">Basic Needs</option>
              <option value="medis">Medical</option>
              <option value="kenyamanan">Comfort</option>
              <option value="bantuan">Assistance</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn secondary">
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {phrase ? 'Update' : 'Create'} Phrase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Phrases;