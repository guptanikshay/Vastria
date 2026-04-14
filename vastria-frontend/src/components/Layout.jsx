import { NavLink, Outlet } from "react-router-dom";
import { Shirt, Layers, Sparkles, Plus, User } from "lucide-react";
import ChatWidget from "./ChatWidget";

export default function Layout() {
  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner container">
          <NavLink to="/" className="logo">
            Vastria
          </NavLink>
          <div className="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Shirt size={18} />
              <span>Wardrobe</span>
            </NavLink>
            <NavLink
              to="/outfits"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Layers size={18} />
              <span>Outfits</span>
            </NavLink>
            <NavLink
              to="/recommendations"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Sparkles size={18} />
              <span>For You</span>
            </NavLink>
          </div>
          <div className="nav-actions">
            <NavLink to="/add" className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Add</span>
            </NavLink>
            <NavLink to="/profile" className="nav-avatar">
              <User size={20} />
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}
