import { X } from "lucide-react";

export default function ItemModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="modal-body">
          <div className="modal-image">
            <img src={item.media?.imageUrl} alt={item.itemName} />
          </div>
          <div className="modal-details">
            <h2>{item.itemName}</h2>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span>
                  {item.category}
                  {item.subCategory ? ` / ${item.subCategory}` : ""}
                </span>
              </div>
              {item.attributes?.color && (
                <div className="detail-row">
                  <span className="detail-label">Color</span>
                  <span>{item.attributes.color}</span>
                </div>
              )}
              {item.attributes?.pattern && (
                <div className="detail-row">
                  <span className="detail-label">Pattern</span>
                  <span>{item.attributes.pattern}</span>
                </div>
              )}
              {item.attributes?.material && (
                <div className="detail-row">
                  <span className="detail-label">Material</span>
                  <span>{item.attributes.material}</span>
                </div>
              )}
              {item.attributes?.fit && (
                <div className="detail-row">
                  <span className="detail-label">Fit</span>
                  <span>{item.attributes.fit}</span>
                </div>
              )}
              {item.brand && (
                <div className="detail-row">
                  <span className="detail-label">Brand</span>
                  <span>{item.brand}</span>
                </div>
              )}
              {item.price && (
                <div className="detail-row">
                  <span className="detail-label">Price</span>
                  <span>
                    {item.currency === "INR" ? "₹" : "$"}
                    {item.price}
                  </span>
                </div>
              )}
            </div>
            {item.style?.length > 0 && (
              <div className="detail-tags">
                <span className="detail-label">Style</span>
                <div className="tag-list">
                  {item.style.map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.occasion?.length > 0 && (
              <div className="detail-tags">
                <span className="detail-label">Occasion</span>
                <div className="tag-list">
                  {item.occasion.map((o) => (
                    <span key={o} className="tag">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.season?.length > 0 && (
              <div className="detail-tags">
                <span className="detail-label">Season</span>
                <div className="tag-list">
                  {item.season.map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
