import { useState, useEffect } from "react";
import { Loader, Heart } from "lucide-react";
import api from "../api/axios";
import OutfitModal from "../components/OutfitModal";

export default function Recommendations() {
  const [tab, setTab] = useState("outfits");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [season, setSeason] = useState("");
  const [outfits, setOutfits] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [formOptions, setFormOptions] = useState(null);
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  useEffect(() => {
    api
      .get("/clothing/form-options")
      .then((res) => setFormOptions(res.data.data))
      .catch(console.error);
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const itemsRes = await api.get("/clothing");
      const lookup = {};
      itemsRes.data.data.forEach((i) => {
        lookup[i._id] = i;
      });
      setItems(lookup);

      const params = {};
      if (occasion) params.occasion = occasion;
      if (weather) params.weather = weather;
      if (season) params.season = season;

      const res = await api.get("/recommendations", { params });
      setOutfits(res.data.data.outfits || res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.get("/recommendations/wardrobe-analysis");
      setAnalysis(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to get analysis");
    } finally {
      setLoading(false);
    }
  };

  const getItemImage = (outfitItem) => {
    if (!outfitItem) return null;
    return items[outfitItem.id]?.media?.imageUrl;
  };

  const fetchFavourites = async () => {
    setLoading(true);
    try {
      const [itemsRes, favsRes] = await Promise.all([
        api.get("/clothing"),
        api.get("/outfits/favourites"),
      ]);
      const lookup = {};
      itemsRes.data.data.forEach((i) => {
        lookup[i._id] = i;
      });
      setItems(lookup);
      setFavourites(favsRes.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to get favourites");
    } finally {
      setLoading(false);
    }
  };

  const removeFav = async (outfitId) => {
    try {
      await api.patch(`/outfits/${outfitId}/favourite`);
      setFavourites((prev) => prev.filter((o) => o._id !== outfitId));
    } catch (err) {
      console.error("Failed to remove favourite", err);
    }
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

  return (
    <div className="recs-page container">
      <h1>For You</h1>

      <div className="tabs">
        <button
          className={`tab ${tab === "outfits" ? "active" : ""}`}
          onClick={() => setTab("outfits")}
        >
          Outfit Picks
        </button>
        <button
          className={`tab ${tab === "analysis" ? "active" : ""}`}
          onClick={() => {
            setTab("analysis");
            if (!analysis) fetchAnalysis();
          }}
        >
          Wardrobe Analysis
        </button>
        <button
          className={`tab ${tab === "favourites" ? "active" : ""}`}
          onClick={() => {
            setTab("favourites");
            fetchFavourites();
          }}
        >
          Favourites
        </button>
      </div>

      {tab === "outfits" && (
        <>
          <div className="filter-bar">
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            >
              <option value="">Any Occasion</option>
              {formOptions?.occasions?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
            >
              <option value="">Any Weather</option>
              {formOptions?.weather?.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select value={season} onChange={(e) => setSeason(e.target.value)}>
              <option value="">Any Season</option>
              {formOptions?.seasons?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={fetchRecommendations}
              disabled={loading}
            >
              {loading ? "Loading..." : "Get Picks"}
            </button>
          </div>

          {outfits.length > 0 && (
            <div className="outfits-grid">
              {outfits.map((outfit, i) => (
                <div
                  key={i}
                  className="outfit-card"
                  onClick={() => setSelectedOutfit(outfit)}
                >
                  <div className="outfit-score">{outfit.score}</div>
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
        </>
      )}

      {tab === "analysis" && (
        <div className="analysis-section">
          {loading && (
            <div className="page-loader">
              <Loader size={24} className="spin" /> Analyzing your wardrobe...
            </div>
          )}
          {analysis && (
            <div className="analysis-content">
              {analysis.summary && (
                <div className="analysis-summary">
                  <p>
                    <strong>Wardrobe Overview:</strong>{" "}
                    {analysis.summary.totalItems} items across{" "}
                    {Object.keys(analysis.summary.categories || {}).length}{" "}
                    categories
                  </p>
                </div>
              )}
              {analysis.strengths?.length > 0 && (
                <div className="analysis-rec">
                  <h3>Strengths</h3>
                  {analysis.strengths.map((s, i) => (
                    <p key={i}>✓ {s}</p>
                  ))}
                </div>
              )}
              {analysis.gaps?.length > 0 && (
                <div className="analysis-rec">
                  <h3>Gaps</h3>
                  {analysis.gaps.map((g, i) => (
                    <p key={i}>• {g}</p>
                  ))}
                </div>
              )}
              {analysis.recommendations?.map((rec, i) => (
                <div key={i} className="analysis-rec">
                  <h3>{rec.title || rec.category || `Suggestion ${i + 1}`}</h3>
                  <p>{rec.reason || rec.description}</p>
                  {rec.products?.length > 0 && (
                    <div className="product-grid">
                      {rec.products.map((p, j) => (
                        <a
                          key={j}
                          href={p.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="product-card"
                        >
                          {p.thumbnail && (
                            <img src={p.thumbnail} alt={p.title} />
                          )}
                          <div className="product-info">
                            <span className="product-title">{p.title}</span>
                            <span className="product-price">{p.price}</span>
                            <span className="product-source">{p.source}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "favourites" && (
        <div className="favourites-section">
          {loading && (
            <div className="page-loader">
              <Loader size={24} className="spin" /> Loading favourites...
            </div>
          )}
          {!loading && favourites.length === 0 && (
            <div className="empty-state">
              <p>
                No favourite outfits yet. Heart an outfit on the Outfits page to
                save it here!
              </p>
            </div>
          )}
          {!loading && favourites.length > 0 && (
            <div className="outfits-grid">
              {favourites.map((outfit) => (
                <div
                  key={outfit._id}
                  className="outfit-card"
                  onClick={() => setSelectedOutfit(outfit)}
                >
                  <div className="outfit-card-header">
                    <div className="outfit-score">{outfit.score}</div>
                    <button
                      className="fav-btn fav-active"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFav(outfit._id);
                      }}
                      title="Remove from favourites"
                    >
                      <Heart size={18} fill="#e74c3c" stroke="#e74c3c" />
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
      )}

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
