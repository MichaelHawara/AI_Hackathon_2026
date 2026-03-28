import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, db, doc, onSnapshot } from './firebase';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';

const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const MyJobs = lazy(() => import('./pages/MyJobs'));
const Documents = lazy(() => import('./pages/Documents'));
const Account = lazy(() => import('./pages/Account'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-stone-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setUser(user);
      if (user) {
        const profileRef = doc(db, 'users', user.uid);
        unsubProfile = onSnapshot(profileRef, (docSnap) => {
          setHasProfile(docSnap.exists());
          setLoading(false);
        });
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });
    return () => {
      unsubProfile?.();
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return <SuspenseFallback />;
  }

  const showOnboarding = user && hasProfile === false;
  const showHome = user && hasProfile === true;

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        {showHome && <Navbar />}
        <main className={showHome ? 'pt-16 pb-20 px-4 max-w-7xl mx-auto' : ''}>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route
                path="/"
                element={
                  !user ? (
                    <Onboarding />
                  ) : showOnboarding ? (
                    <Onboarding />
                  ) : (
                    <Home />
                  )
                }
              />
              <Route
                path="/search"
                element={showHome ? <Search /> : <Navigate to="/" />}
              />
              <Route
                path="/my-jobs"
                element={showHome ? <MyJobs /> : <Navigate to="/" />}
              />
              <Route
                path="/documents"
                element={showHome ? <Documents /> : <Navigate to="/" />}
              />
              <Route
                path="/account"
                element={showHome ? <Account /> : <Navigate to="/" />}
              />
            </Routes>
          </Suspense>
        </main>
        {showHome && <Chatbot />}
      </div>
    </Router>
  );
}
