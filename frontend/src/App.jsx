import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import Navbar from "./components/Navbar.jsx";
import DangerToast from "./components/DangerToast.jsx";

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-night-900 text-white overflow-hidden">
        <Navbar />
        <DangerToast />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
