import { Trash2 } from "lucide-react";

export default function ClothingCard({ item, onClick, onDelete }) {
  return (
    <div className="clothing-card" onClick={() => onClick?.(item)}>
      <img
        src={item.media?.imageUrl}
        alt={item.itemName || "Clothing item"}
        loading="lazy"
      />
      {onDelete && (
        <button
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item._id);
          }}
          title="Delete item"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
