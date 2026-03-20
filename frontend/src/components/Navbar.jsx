import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="glass-card sticky top-0 z-50 px-6 py-3 flex items-center justify-between shrink-0">
      <Link to="/" className="flex items-center gap-2.5 group">
        <span className="text-2xl">🌙</span>
        <span className="text-lg font-black tracking-wide text-white group-hover:text-indigo-300 transition-colors">
          NightSafe
        </span>
      </Link>
      <div className="flex gap-1">
        <NavLink to="/" active={pathname === "/"}>
          Map
        </NavLink>
        <NavLink to="/about" active={pathname === "/about"}>
          About
        </NavLink>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
        ${active
          ? "bg-indigo-500/15 text-indigo-300"
          : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
    >
      {children}
    </Link>
  );
}
