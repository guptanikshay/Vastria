import { X } from "lucide-react";

export default function OutfitModal({ outfit, items, onClose }) {
  if (!outfit) return null;

  const getItem = (piece) => {
    if (!piece) return null;
    return items[piece.id];
  };

  const pieces = [];
  outfit.top?.forEach((t, j) =>
    pieces.push({ piece: t, label: j === 0 ? "Top" : "Layer" }),
  );
  if (outfit.bottom) pieces.push({ piece: outfit.bottom, label: "Bottom" });
  if (outfit.footwear) pieces.push({ piece: outfit.footwear, label: "Shoes" });
  outfit.accessories?.forEach((a) =>
    pieces.push({ piece: a, label: "Accessory" }),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="outfit-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="outfit-modal-title">
          Outfit <span className="outfit-modal-score">{outfit.score}</span>
        </h2>
        <div className="outfit-modal-grid">
          {pieces.map(({ piece, label }) => {
            const full = getItem(piece);
            const img = full?.media?.imageUrl;
            return (
              <div className="outfit-modal-item" key={`${label}-${piece.id}`}>
                {img ? (
                  <img src={img} alt={piece.name} />
                ) : (
                  <div className="outfit-modal-placeholder">{piece.name}</div>
                )}
                <div className="outfit-modal-info">
                  <span className="outfit-modal-label">{label}</span>
                  <span className="outfit-modal-name">
                    {full?.itemName || piece.name}
                  </span>
                  {full?.attributes?.color && (
                    <span className="outfit-modal-meta">
                      {full.attributes.color}
                      {full.attributes.pattern &&
                      full.attributes.pattern !== "solid"
                        ? ` · ${full.attributes.pattern}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
