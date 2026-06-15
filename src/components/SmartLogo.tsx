import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import atelierWordmark from "@/assets/atelier-logo-full.png";

/**
 * The Atelier wordmark, as a smart link.
 * - Signed in   → /chat (start a new chat / home)
 * - Signed out  → /     (landing)
 */
export function SmartLogo({
  className = "h-14 w-auto",
  alt = "Atelier — home",
}: {
  className?: string;
  alt?: string;
}) {
  const { signedIn } = useAuth();
  return (
    <Link
      to={signedIn ? "/chat" : "/"}
      aria-label={alt}
      className="inline-flex items-center shrink-0 hover:opacity-90 transition-opacity"
    >
      <img
        src={atelierWordmark}
        alt={alt}
        className={`${className} object-contain`}
        draggable={false}
      />
    </Link>
  );
}
