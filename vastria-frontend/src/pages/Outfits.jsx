import { useState, useEffect, useMemo } from "react";
import { Loader, Heart, RefreshCw, ChevronDown } from "lucide-react";
import api from "../api/axios";
import OutfitModal from "../components/OutfitModal";

const CATEGORY_ORDER = ["Formal", "Semi-Formal", "Smart Casual", "Casual"];

export default function Outfits() {
  const [outfits, setOutfits] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showRefresh, setShowRefresh] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    CATEGORY_ORDER.forEach((cat) => (init[cat] = true));
    return init;
  });

  // Load saved outfits + clothing lookup on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [itemsRes, outfitsRes] = await Promise.all([
          api.get("/clothing"),
          api.get("/outfits"),
        ]);
        const lookup = {};
        itemsRes.data.data.forEach((i) => {
          lookup[i._id] = i;
        });
        setItems(lookup);
        setOutfits(outfitsRes.data.data || []);

        // Check if wardrobe count differs from what outfits reference
        const savedIds = new Set();
        (outfitsRes.data.data || []).forEach((o) => {
          o.top?.forEach((t) => savedIds.add(t.id));
          if (o.bottom) savedIds.add(o.bottom.id);
          if (o.footwear) savedIds.add(o.footwear.id);
          o.accessories?.forEach((a) => savedIds.add(a.id));
        });
        const currentIds = new Set(itemsRes.data.data.map((i) => i._id));
        const hasNew = [...currentIds].some((id) => !savedIds.has(id));
        if (hasNew && outfitsRes.data.data?.length > 0) {
          setShowRefresh(true);
        }
      } catch (err) {
        console.error("Failed to load outfits", err);
      } finally {
        setInitialLoad(false);
      }
    };
    load();
  }, []);

  const generate = async () => {
    setLoading(true);
    setShowRefresh(false);
    try {
      const itemsRes = await api.get("/clothing");
      const lookup = {};
      itemsRes.data.data.forEach((i) => {
        lookup[i._id] = i;
      });
      setItems(lookup);

      const res = await api.post("/outfits/generate", {
        minScore: 50,
      });
      setOutfits(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate outfits");
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = async (outfitId) => {
    try {
      const res = await api.patch(`/outfits/${outfitId}/favourite`);
      setOutfits((prev) =>
        prev.map((o) =>
          o._id === outfitId ? { ...o, favourite: res.data.data.favourite } : o,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle favourite", err);
    }
  };

  const getItemImage = (outfitItem) => {
    if (!outfitItem) return null;
    return items[outfitItem.id]?.media?.imageUrl;
  };

  // Group outfits by category
  const groupedOutfits = useMemo(() => {
    const groups = {};
    CATEGORY_ORDER.forEach((cat) => (groups[cat] = []));
    outfits.forEach((outfit) => {
      const cat = outfit.category || "Casual";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(outfit);
    });
    return groups;
  }, [outfits]);

  // Reset all sections to expanded when outfits regenerate
  useEffect(() => {
    const init = {};
    CATEGORY_ORDER.forEach((cat) => (init[cat] = true));
    setExpanded(init);
  }, [outfits]);

  const toggleCategory = (cat) => {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const renderPiece = (outfitItem, label) => {
    if (!outfitItem) return null;
    const img = getItemImage(outfitItem);
    return (
      <div className="outfit-piece" key={`${label}-${outfitItem.id}`}>
        {img ? (
          <img src={img} alt={outfitItem.name} />
        ) : (
          <div className="outfit-piece-placeholder">{outfitItem.name}</div>
        )}
        <span className="piece-label">{label}</span>
      </div>
    );
  };

  if (initialLoad) {
    return (
      <div className="outfits-page container">
        <div className="page-loader">
          <Loader size={24} className="spin" /> Loading outfits...
        </div>
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="outfits-page container">
        <div className="hero-section">
          <h1>Outfit Generator</h1>
          <p>Let AI create outfit combinations from your wardrobe</p>
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="spin" /> Generating...
              </>
            ) : (
              "Generate Outfits"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="outfits-page container">
      <div className="page-header">
        <h1>Your Outfits</h1>
        <div className="page-header-actions">
          {showRefresh && (
            <button
              className="btn btn-accent"
              onClick={generate}
              disabled={loading}
            >
              <RefreshCw size={16} /> Refresh Outfits
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      <div className="outfit-categories">
        {CATEGORY_ORDER.map((category) => {
          const catOutfits = groupedOutfits[category];
          if (!catOutfits?.length) return null;

          return (
            <div key={category} className="outfit-category">
              <button
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                <h2>{category}</h2>
                <span className="category-count">{catOutfits.length}</span>
                <ChevronDown
                  size={20}
                  className={`category-chevron ${expanded[category] ? "expanded" : ""}`}
                />
              </button>
              {expanded[category] && (
                <div className="outfits-grid">
                  {catOutfits.map((outfit) => (
                    <div
                      key={outfit._id}
                      className="outfit-card"
                      onClick={() => setSelectedOutfit(outfit)}
                    >
                      <div className="outfit-card-header">
                        <div className="outfit-score">{outfit.score}</div>
                        <button
                          className={`fav-btn ${outfit.favourite ? "fav-active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFav(outfit._id);
                          }}
                          title={
                            outfit.favourite
                              ? "Remove from favourites"
                              : "Add to favourites"
                          }
                        >
                          <Heart
                            size={18}
                            fill={outfit.favourite ? "#e74c3c" : "none"}
                            stroke={
                              outfit.favourite ? "#e74c3c" : "currentColor"
                            }
                          />
                        </button>
                      </div>
                      <div className="outfit-pieces">
                        {outfit.top?.map((t, j) =>
                          renderPiece(t, j === 0 ? "Top" : "Layer"),
                        )}
                        {renderPiece(outfit.bottom, "Bottom")}
                        {renderPiece(outfit.footwear, "Shoes")}
                        {outfit.accessories?.map((a) => renderPiece(a, "Acc."))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedOutfit && (
        <OutfitModal
          outfit={selectedOutfit}
          items={items}
          onClose={() => setSelectedOutfit(null)}
        />
      )}
    </div>
  );
}
