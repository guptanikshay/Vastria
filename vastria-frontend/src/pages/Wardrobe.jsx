import { useState, useEffect } from "react";
import api from "../api/axios";
import ClothingCard from "../components/ClothingCard";
import ItemModal from "../components/ItemModal";

const CATEGORY_ORDER = [
  "topwear",
  "bottomwear",
  "fullbody",
  "outerwear",
  "footwear",
  "accessories",
  "ethnic",
  "activewear",
  "innerwear",
];

const CATEGORY_LABELS = {
  topwear: "Topwear",
  bottomwear: "Bottomwear",
  fullbody: "Full Body",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessories: "Accessories",
  ethnic: "Ethnic",
  activewear: "Activewear",
  innerwear: "Innerwear",
};

export default function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  const deleteItem = async (id) => {
    try {
      await api.delete(`/clothing/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete item");
    }
  };

  useEffect(() => {
    api
      .get("/clothing")
      .then((res) => setItems(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = {};
  items.forEach((item) => {
    const cat = item.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length > 0);

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    document
      .getElementById(`category-${cat}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return <div className="page-loader">Loading your wardrobe...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h2>Your wardrobe is empty</h2>
        <p>Add your first item to get started</p>
        <a href="/add" className="btn btn-primary">
          Add Item
        </a>
      </div>
    );
  }

  return (
    <div className="wardrobe-page container">
      <div className="wardrobe-header">
        <h1>My Wardrobe</h1>
        <span className="item-count">{items.length} items</span>
      </div>

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? "active" : ""}`}
            onClick={() => scrollToCategory(cat)}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {categories.map((cat) => (
        <section key={cat} id={`category-${cat}`} className="wardrobe-section">
          <h2 className="section-title">{CATEGORY_LABELS[cat] || cat}</h2>
          <div className="wardrobe-grid">
            {grouped[cat].map((item) => (
              <ClothingCard
                key={item._id}
                item={item}
                onClick={setSelectedItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </section>
      ))}

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
