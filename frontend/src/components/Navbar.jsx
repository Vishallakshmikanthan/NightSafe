import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between shrink-0 border-b bg-card/80 backdrop-blur-md">
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
        <NavLink to="/dashboard" active={pathname === "/dashboard"} accent="teal">
          Safety Intel
        </NavLink>
        <NavLink to="/safety" active={pathname === "/safety"} accent="coral">
          Safety Hub
        </NavLink>
        <NavLink to="/agents" active={pathname === "/agents"}>
          Agents
        </NavLink>
        <NavLink to="/profile" active={pathname === "/profile"}>
          Profile
        </NavLink>
        <NavLink to="/about" active={pathname === "/about"}>
          About
        </NavLink>
      </div>
    </nav>
  );
}

function NavLink({ to, active, accent, children }) {
  const activeClass = accent === 'teal'
    ? 'bg-[#00F5D4]/10 text-[#00F5D4] border border-[#00F5D4]/20'
    : accent === 'coral'
    ? 'bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20'
    : 'bg-indigo-500/15 text-indigo-300';
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      asChild
      className={active ? activeClass : "text-muted-foreground"}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}
