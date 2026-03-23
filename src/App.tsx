import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, db, doc, getDoc, onSnapshot } from './firebase';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import MyJobs from './pages/MyJobs';
import Documents from './pages/Documents';
import Account from './pages/Account';
import Onboarding from './pages/Onboarding';
import Chatbot from './components/Chatbot';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Listen for profile changes
        const profileRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          setHasProfile(docSnap.exists());
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const showOnboarding = user && hasProfile === false;
  const showHome = user && hasProfile === true;

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        {showHome && <Navbar />}
        <main className={showHome ? "pt-16 pb-20 px-4 max-w-7xl mx-auto" : ""}>
          <Routes>
            <Route path="/" element={
              !user ? <Onboarding /> : 
              showOnboarding ? <Onboarding /> : 
              <Home />
            } />
            <Route path="/search" element={showHome ? <Search /> : <Navigate to="/" />} />
            <Route path="/my-jobs" element={showHome ? <MyJobs /> : <Navigate to="/" />} />
            <Route path="/documents" element={showHome ? <Documents /> : <Navigate to="/" />} />
            <Route path="/account" element={showHome ? <Account /> : <Navigate to="/" />} />
          </Routes>
        </main>
        {showHome && <Chatbot />}
      </div>
    </Router>
  );
}
