import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onError }) {
  const { googleLogin } = useAuth();
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        width: btnRef.current?.offsetWidth || 320,
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
      });
    };

    if (window.google?.accounts) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      await googleLogin(response.credential);
    } catch (err) {
      onError?.(err.response?.data?.message || "Google sign-in failed");
    }
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={btnRef} className="google-btn-wrapper" />;
}
