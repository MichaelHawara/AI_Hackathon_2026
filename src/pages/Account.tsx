import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Award, BookOpen, Settings, Save, Linkedin, Plus, X, Edit2, LogOut } from 'lucide-react';
import { db, auth, doc, getDoc, updateDoc, signOut } from '../firebase';
import { UserProfile } from '../types';

export default function Account() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: auth.currentUser.uid, ...docSnap.data() } as UserProfile);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      const { uid, ...data } = profile;
      await updateDoc(doc(db, 'users', auth.currentUser.uid), data);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) return <div className="animate-pulse space-y-8"><div className="h-40 bg-stone-200 rounded-3xl"></div></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Profile</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Personal Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-stone-100 rounded-full mx-auto mb-4 flex items-center justify-center text-stone-300">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="PFP" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={48} />
              )}
            </div>
            <h2 className="font-bold text-xl text-stone-900">{profile?.fullName}</h2>
            <p className="text-stone-400 text-sm mb-4">{profile?.email}</p>
            <button className="w-full flex items-center justify-center space-x-2 bg-[#0077B5] text-white p-2 rounded-xl text-xs font-bold hover:bg-[#006097] transition-colors">
              <Linkedin size={14} />
              <span>Sync LinkedIn</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-widest">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center text-stone-600 text-sm">
                <Mail size={16} className="mr-3 text-stone-400" />
                <span>{profile?.email}</span>
              </div>
              <div className="flex items-center text-stone-600 text-sm">
                <Phone size={16} className="mr-3 text-stone-400" />
                <span>{profile?.phone || 'Add phone'}</span>
              </div>
              <div className="flex items-center text-stone-600 text-sm">
                <MapPin size={16} className="mr-3 text-stone-400" />
                <span>{profile?.address || 'Add address'}</span>
              </div>
              <div className="flex items-center text-stone-600 text-sm">
                <Calendar size={16} className="mr-3 text-stone-400" />
                <span>Born {profile?.dob || 'Add DOB'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Experience & Education */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Award className="text-emerald-600" size={24} />
                <h3 className="font-bold text-xl text-stone-900">Experience</h3>
              </div>
              <button className="text-emerald-600 font-bold text-sm">+ Add</button>
            </div>
            
            <div className="space-y-6">
              {profile?.experience?.length ? profile.experience.map((exp, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-stone-100">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full"></div>
                  <h4 className="font-bold text-stone-900">{exp.role}</h4>
                  <p className="text-emerald-600 text-sm font-medium">{exp.company}</p>
                  <p className="text-stone-400 text-xs mb-2">{exp.startDate} - {exp.endDate}</p>
                  <p className="text-stone-600 text-sm">{exp.description}</p>
                </div>
              )) : (
                <p className="text-stone-400 text-sm italic">No experience added yet.</p>
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <BookOpen className="text-emerald-600" size={24} />
                <h3 className="font-bold text-xl text-stone-900">Education</h3>
              </div>
              <button className="text-emerald-600 font-bold text-sm">+ Add</button>
            </div>

            <div className="space-y-6">
              {profile?.education?.length ? profile.education.map((edu, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900">{edu.school}</h4>
                    <p className="text-stone-600 text-sm">{edu.degree} in {edu.major}</p>
                  </div>
                  <span className="text-stone-400 text-xs font-medium">{edu.graduationDate}</span>
                </div>
              )) : (
                <p className="text-stone-400 text-sm italic">No education added yet.</p>
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="font-bold text-xl text-stone-900 mb-6 flex items-center space-x-3">
              <Settings className="text-emerald-600" size={24} />
              <span>Skills</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.map((skill, i) => (
                <span key={i} className="px-4 py-2 bg-stone-50 text-stone-700 rounded-xl text-sm font-bold border border-stone-100">
                  {skill}
                </span>
              ))}
              <button className="px-4 py-2 border-2 border-dashed border-stone-200 text-stone-400 rounded-xl text-sm font-bold hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                + Add Skill
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
