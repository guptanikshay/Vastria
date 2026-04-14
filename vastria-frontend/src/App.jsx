import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Wardrobe from "./pages/Wardrobe";
import AddItem from "./pages/AddItem";
import Outfits from "./pages/Outfits";
import Recommendations from "./pages/Recommendations";
import Profile from "./pages/Profile";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route
        path="/verify"
        element={
          !user ? (
            <Navigate to="/login" />
          ) : user.isVerified === false ? (
            <VerifyEmail />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Wardrobe />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/outfits" element={<Outfits />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}
