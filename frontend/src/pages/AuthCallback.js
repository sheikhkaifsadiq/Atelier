import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { applyToken } = useAuth();

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const error = params.get("error");
    if (error || !accessToken) {
      navigate("/login?error=oauth", { replace: true });
      return;
    }
    applyToken(accessToken, refreshToken);
    navigate("/chat", { replace: true });
  }, [params, applyToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-ink-300">
      Signing you in…
    </div>
  );
}
