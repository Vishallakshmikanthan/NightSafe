import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-night-800 border-b border-night-600 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-wide">
        🌙 NightSafe
      </Link>
      <div className="flex gap-6 text-sm">
        <Link to="/" className="hover:text-safe transition-colors">
          Map
        </Link>
        <Link to="/about" className="hover:text-safe transition-colors">
          About
        </Link>
      </div>
    </nav>
  );
}
