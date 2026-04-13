import { Link } from "react-router-dom";
import logo from '../../assets/logos/logo.png';
export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

        <div className="flex items-center">
          <Link to="/status">
            <img src={logo} alt="Logo" className="h-11 w-auto mr-4" />
          </Link>
        </div>

        <Link to="/status/subscribe">
          <button className="bg-[#1565C0] hover:bg-[#0d47a1] transition-colors text-white text-xs font-semibold tracking-widest px-6 py-2.5 rounded">
            Subscribe
          </button>
        </Link>

      </div>
    </header>
  );
}