import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { type Phrase } from "../../types";
import { usePhrasesStorage } from "../../hooks/useLocalStorage";
import "./Phrases.css";

const Phrases: React.FC = () => {
  const {
    phrases,
    isLoading,
    addPhrase,
    updatePhrase,
    deletePhrase,
    getCategories,
    reloadPhrases,
  } = usePhrasesStorage();

  const [filteredPhrases, setFilteredPhrases] = useState<Phrase[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Default categories
  const defaultCategories = [
    "basic_need",
    "medical",
    "comfort",
    "help",
    "emergency",
  ];

  // Get all available categories (combine default and existing)
  const allCategories = [
    ...new Set([...defaultCategories, ...getCategories()]),
  ];

  // Filter phrases based on search and category
  useEffect(() => {
    let filtered = phrases;

    if (searchTerm) {
      filtered = filtered.filter(
        (phrase) =>
          phrase.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          phrase.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (phrase) => phrase.category === selectedCategory
      );
    }

    setFilteredPhrases(filtered);
  }, [searchTerm, selectedCategory, phrases]);

  const handleSavePhrase = (
    phraseData: Omit<Phrase, "id" | "createdAt" | "usageCount">
  ) => {
    if (editingPhrase) {
      updatePhrase(editingPhrase.id, {
        ...phraseData,
        color: editingPhrase.color,
      });
    } else {
      addPhrase(phraseData);
    }
    setIsModalOpen(false);
    setEditingPhrase(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure want to delete this phrase?")) {
      deletePhrase(id);
    }
  };

  const handleDeploy = () => {
    // Send phrases to devices
    console.log("Deploying phrases to devices...", phrases);
    alert(`Successfully deployed ${phrases.length} phrases to devices!`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedPhrases: Phrase[] = JSON.parse(content);

        // Validate and add imported phrases
        importedPhrases.forEach((phrase) => {
          if (phrase.text && phrase.category) {
            addPhrase({
              text: phrase.text,
              category: phrase.category,
              audioUrl: phrase.audioUrl,
              color: phrase.color,
            });
          }
        });

        alert(`Successfully imported ${importedPhrases.length} phrases.`);
      } catch (error) {
        alert("Error importing phrases.");
        console.error("Import error:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset input
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(phrases, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eyetalk2u-phrases-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearAllPhrases = () => {
    if (window.confirm("Do you want to clear all phrases?")) {
      phrases.forEach((phrase) => deletePhrase(phrase.id));
    }
  };

  if (isLoading) {
    return (
      <div className="phrases-page">
        <div className="loading-container">
          <RefreshCw size={32} className="spinner" />
          <p>Load phrases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="phrases-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Phrase Management</h1>
          <div className="phrases-stats">
            <span className="stat">{phrases.length} Total Phrase</span>
            <span className="stat">{getCategories().length} Category</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn secondary" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <label className="btn secondary" htmlFor="import-file">
            <Upload size={16} />
            Import
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            Add Phrase
          </button>
          {phrases.length > 0 && (
            <button className="btn danger" onClick={handleDeploy}>
              <Download size={16} />
              Deploy to Devices
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
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
        <div className="filter-group">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {allCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button
            onClick={reloadPhrases}
            className="btn icon"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {phrases.length === 0 && (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Phrases Not Found</h3>
          </div>
        </div>
      )}

      {/* Phrases Table */}
      {phrases.length > 0 && (
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
                  <td className="phrase-text">{phrase.text}</td>
                  <td>
                    <span className="category-tag">{phrase.category}</span>
                  </td>
                  <td>
                    <span className="usage-count">{phrase.usageCount}</span>
                  </td>
                  <td className="created-date">
                    {phrase.createdAt.toLocaleDateString("id-ID")}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => {
                          setEditingPhrase(phrase);
                          setIsModalOpen(true);
                        }}
                        className="action-btn edit"
                        title="Edit phrase"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(phrase.id)}
                        className="action-btn delete"
                        title="Delete phrase"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPhrases.length === 0 && (
            <div className="empty-filter">
              <p>No phrases found.</p>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      {phrases.length > 0 && (
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-actions">
            <button onClick={clearAllPhrases} className="btn danger">
              <Trash2 size={16} />
              Delete All Phrases
            </button>
            <p className="warning-text">
              This will permanently delete all phrases and cannot be undone.
            </p>
          </div>
        </div>
      )}

      {/* Phrase Modal */}
      {isModalOpen && (
        <PhraseModal
          phrase={editingPhrase}
          categories={allCategories}
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

const PhraseModal: React.FC<{
  phrase: Phrase | null;
  categories: string[];
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ phrase, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    text: phrase?.text || "",
    category: phrase?.category || "basic_need",
    audioUrl: phrase?.audioUrl || "",
  });

  const [errors, setErrors] = useState<{ text?: string }>({});

  const validateForm = () => {
    const newErrors: { text?: string } = {};
    if (!formData.text.trim()) {
      newErrors.text = "Phrase text is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{phrase ? "Edit Phrase" : "Add New Phrase"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phrase Text *</label>
            <textarea
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              placeholder="Enter phrase text..."
              rows={3}
              className={errors.text ? "error" : ""}
            />
            {errors.text && <span className="error-text">{errors.text}</span>}
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Audio URL (Optional)</label>
            <input
              type="url"
              value={formData.audioUrl}
              onChange={(e) =>
                setFormData({ ...formData, audioUrl: e.target.value })
              }
              placeholder="https://example.com/audio.mp3"
            />
            <small>URL for audio file</small>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn secondary">
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {phrase ? "Update" : "Create"} Phrase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Phrases;
