import { useAuth } from "../context/AuthContext";
import { LogOut, User } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="profile-page container">
      <div className="profile-card">
        <div className="profile-avatar">
          <User size={48} />
        </div>
        <h1>{user?.name}</h1>
        <p className="profile-email">{user?.email}</p>

        {user?.preferences?.style && (
          <div className="profile-section">
            <h3>Style Preference</h3>
            <span className="tag">{user.preferences.style}</span>
          </div>
        )}

        {user?.aiMemory?.favoriteColors?.length > 0 && (
          <div className="profile-section">
            <h3>Favorite Colors</h3>
            <div className="chip-group">
              {user.aiMemory.favoriteColors.map((c) => (
                <span key={c} className="chip active">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {user?.aiMemory?.favoriteStyles?.length > 0 && (
          <div className="profile-section">
            <h3>Favorite Styles</h3>
            <div className="chip-group">
              {user.aiMemory.favoriteStyles.map((s) => (
                <span key={s} className="chip active">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-secondary btn-full"
          onClick={logout}
          style={{ marginTop: 32 }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  );
}
