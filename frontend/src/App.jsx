import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SafetyDashboard from './pages/SafetyDashboard';
import DashboardPage from './pages/DashboardPage';
import AboutPage from './pages/AboutPage';
import SafetyHub from './pages/SafetyHub';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './ErrorBoundary';
import RippleProvider from './components/RippleProvider';

function PageLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-[#050510] overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RippleProvider />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={
            <PageLayout><SafetyDashboard /></PageLayout>
          } />
          <Route path="/agents" element={
            <PageLayout><DashboardPage /></PageLayout>
          } />
          <Route path="/about" element={
            <PageLayout><AboutPage /></PageLayout>
          } />
          <Route path="/safety" element={
            <PageLayout><SafetyHub /></PageLayout>
          } />
          <Route path="/profile" element={
            <PageLayout><Profile /></PageLayout>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
