import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader, Search } from "lucide-react";
import api from "../api/axios";

export default function AddItem() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [formOptions, setFormOptions] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [form, setForm] = useState({
    category: "",
    subCategory: "",
    itemName: "",
    color: "",
    secondaryColors: [],
    pattern: "",
    material: "",
    fit: "",
    length: "",
    style: [],
    occasion: [],
    season: [],
    weather: [],
    brand: "",
    price: "",
    tags: [],
  });

  useEffect(() => {
    api
      .get("/clothing/form-options")
      .then((res) => setFormOptions(res.data.data))
      .catch(console.error);
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/clothing/scan", fd);
      const { imageUrl: url, details } = res.data.data;
      setImageUrl(url);
      setForm({
        category: details.category || "",
        subCategory: details.subCategory || "",
        itemName: details.itemName || "",
        color: details.attributes?.color || "",
        secondaryColors: details.attributes?.secondaryColors || [],
        pattern: details.attributes?.pattern || "",
        material: details.attributes?.material || "",
        fit: details.attributes?.fit || "",
        length: details.attributes?.length || "",
        style: details.style || [],
        occasion: details.occasion || [],
        season: details.season || [],
        weather: details.weather || [],
        brand: details.brand || "",
        price: "",
        tags: details.tags || [],
      });
      setStep("review");
    } catch (err) {
      alert(err.response?.data?.message || "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFileSelect(file);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setSearchResults([]);
    setVisibleCount(5);
    try {
      const res = await api.post("/clothing/search", {
        query: searchQuery.trim(),
      });
      setSearchResults(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handlePickImage = async (url) => {
    setAnalyzing(true);
    try {
      const res = await api.post("/clothing/analyze-image", { imageUrl: url });
      const details = res.data.data;
      setImageUrl(url);
      setForm({
        category: details.category || "",
        subCategory: details.subCategory || "",
        itemName: details.itemName || "",
        color: details.attributes?.color || "",
        secondaryColors: details.attributes?.secondaryColors || [],
        pattern: details.attributes?.pattern || "",
        material: details.attributes?.material || "",
        fit: details.attributes?.fit || "",
        length: details.attributes?.length || "",
        style: details.style || [],
        occasion: details.occasion || [],
        season: details.season || [],
        weather: details.weather || [],
        brand: details.brand || "",
        price: "",
        tags: details.tags || [],
      });
      setStep("review");
    } catch (err) {
      alert(
        err.response?.data?.message || "Analysis failed. Try another image.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/clothing", {
        category: form.category,
        subCategory: form.subCategory,
        itemName: form.itemName,
        attributes: {
          color: form.color,
          secondaryColors: form.secondaryColors,
          pattern: form.pattern,
          material: form.material,
          fit: form.fit,
          length: form.length,
        },
        style: form.style,
        occasion: form.occasion,
        season: form.season,
        weather: form.weather,
        brand: form.brand || undefined,
        price: form.price ? Number(form.price) : undefined,
        tags: form.tags,
        media: { imageUrl },
      });
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  if (step === "upload") {
    return (
      <div className="add-item-page container">
        <h1>Add New Item</h1>
        <div
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !scanning && fileInputRef.current?.click()}
        >
          {scanning ? (
            <div className="upload-scanning">
              <Loader size={40} className="spin" />
              <p>Analyzing your item...</p>
            </div>
          ) : (
            <>
              <Upload size={48} strokeWidth={1.5} />
              <p>Drag & drop an image here</p>
              <span className="upload-hint">or click to browse</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>

        <div className="search-divider">
          <span>or search the web</span>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for an item (e.g. blue denim jacket)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={searching}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? (
              <Loader size={18} className="spin" />
            ) : (
              <Search size={18} />
            )}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            <p className="search-results-hint">Pick an image to add</p>
            <div className="search-grid">
              {searchResults.slice(0, visibleCount).map((img, i) => (
                <button
                  key={i}
                  className="search-result-card"
                  onClick={() => handlePickImage(img.original || img.thumbnail)}
                  disabled={analyzing}
                >
                  <img
                    src={img.thumbnail || img.original}
                    alt={img.title || "Search result"}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            {visibleCount < searchResults.length && (
              <button
                className="show-more-link"
                onClick={() => setVisibleCount((c) => c + 5)}
              >
                Show more...
              </button>
            )}
          </div>
        )}

        {analyzing && (
          <div className="fullpage-overlay">
            <Loader size={40} className="spin" />
            <p>Analyzing image...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="add-item-page container">
      <h1>Review Details</h1>
      <div className="review-layout">
        <div className="review-image">
          <img src={imageUrl} alt={form.itemName} />
        </div>
        <div className="review-form">
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => updateForm("itemName", e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
              >
                <option value="">Select</option>
                {formOptions?.categories?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Sub Category</label>
              <select
                value={form.subCategory}
                onChange={(e) => updateForm("subCategory", e.target.value)}
              >
                <option value="">Select</option>
                {form.category &&
                  formOptions?.subCategories?.[form.category]?.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => updateForm("color", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pattern</label>
              <select
                value={form.pattern}
                onChange={(e) => updateForm("pattern", e.target.value)}
              >
                <option value="">Select</option>
                {formOptions?.patterns?.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Material</label>
              <select
                value={form.material}
                onChange={(e) => updateForm("material", e.target.value)}
              >
                <option value="">Select</option>
                {formOptions?.materials?.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fit</label>
              <select
                value={form.fit}
                onChange={(e) => updateForm("fit", e.target.value)}
              >
                <option value="">Select</option>
                {formOptions?.fits?.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Style</label>
            <div className="chip-group">
              {formOptions?.styles?.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${form.style.includes(s) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("style", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Occasion</label>
            <div className="chip-group">
              {formOptions?.occasions?.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`chip ${form.occasion.includes(o) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("occasion", o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Season</label>
            <div className="chip-group">
              {formOptions?.seasons?.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${form.season.includes(s) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("season", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Weather</label>
            <div className="chip-group">
              {formOptions?.weather?.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`chip ${form.weather.includes(w) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("weather", w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => updateForm("brand", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateForm("price", e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Add to Wardrobe"}
          </button>
        </div>
      </div>
    </div>
  );
}
