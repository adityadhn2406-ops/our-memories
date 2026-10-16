import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, setDoc, 
  deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  Play, Plus, Settings, X, ChevronLeft, ChevronRight, 
  Trash, Upload, Lock, Image as ImageIcon, Video, Home 
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'us-memories-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [view, setView] = useState('locked'); // 'locked', 'home', 'player', 'admin'
  const [currentEpisode, setCurrentEpisode] = useState(null);
  
  // Settings / Security
  const [siteSettings, setSiteSettings] = useState({ viewerPin: '0000', adminPin: '1234', bannerImage: '' });
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // --- AUTH & DATA FETCHING ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch Episodes
    const epRef = collection(db, 'artifacts', appId, 'public', 'data', 'episodes');
    const unsubEpisodes = onSnapshot(epRef, (snapshot) => {
      const eps = [];
      snapshot.forEach(doc => eps.push({ id: doc.id, ...doc.data() }));
      // Sort numerically by episode number (extracted from "EP X")
      eps.sort((a, b) => {
        const numA = parseInt(a.title.replace('EP ', '')) || 0;
        const numB = parseInt(b.title.replace('EP ', '')) || 0;
        return numA - numB;
      });
      setEpisodes(eps);
    }, (error) => console.error("Episodes Error:", error));

    // Fetch Settings
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data());
      }
    }, (error) => console.error("Settings Error:", error));

    return () => {
      unsubEpisodes();
      unsubSettings();
    };
  }, [user]);

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (enteredPin === siteSettings.adminPin) {
      setView('admin');
      setPinError('');
    } else if (enteredPin === siteSettings.viewerPin || enteredPin === '') {
      setView('home');
      setPinError('');
    } else {
      setPinError('Incorrect PIN');
    }
  };

  // --- COMPONENTS ---

  const LockScreen = () => (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-6xl font-black text-red-600 tracking-widest mb-12">US</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4 bg-zinc-900 p-8 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold text-center mb-4">Enter Access PIN</h2>
        <input 
          type="password" 
          placeholder="PIN"
          className="w-full bg-zinc-800 text-white p-4 rounded focus:outline-none focus:ring-2 focus:ring-red-600 text-center text-2xl tracking-widest"
          value={enteredPin}
          onChange={(e) => setEnteredPin(e.target.value)}
        />
        {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded transition-colors mt-2">
          Enter
        </button>
        <p className="text-zinc-500 text-xs text-center mt-4">
          Admin or Viewer PIN required. Default Viewer: 0000 | Admin: 1234
        </p>
      </form>
    </div>
  );

  const HomeScreen = () => {
    const bannerUrl = siteSettings.bannerImage || "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=2000&auto=format&fit=crop";
    
    return (
      <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans pb-20">
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center transition-all">
          <div className="text-4xl font-black text-red-600 tracking-widest cursor-pointer">US</div>
          <button 
            onClick={() => setView('locked')} 
            className="text-zinc-300 hover:text-white transition"
          >
            <Lock size={20} />
          </button>
        </nav>

        {/* Hero Banner */}
        <div className="relative h-[70vh] w-full bg-zinc-900 flex items-end">
          <div className="absolute inset-0 w-full h-full">
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>
          <div className="relative z-10 px-4 md:px-12 pb-16 w-full max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg">Our Story</h1>
            <p className="text-lg md:text-xl text-zinc-300 mb-8 drop-shadow max-w-2xl">
              Every moment, captured and kept forever. Relive our favorite memories.
            </p>
            {episodes.length > 0 && (
              <button 
                onClick={() => { setCurrentEpisode(episodes[0]); setView('player'); }}
                className="bg-white text-black px-8 py-3 rounded flex items-center gap-2 font-bold hover:bg-zinc-200 transition-colors"
              >
                <Play size={24} fill="currentColor" /> Play First Episode
              </button>
            )}
          </div>
        </div>

        {/* Episodes Row */}
        <div className="px-4 md:px-12 mt-4 relative z-20">
          <h2 className="text-2xl font-bold mb-4">Episodes</h2>
          {episodes.length === 0 ? (
            <p className="text-zinc-500">No episodes available yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
              {episodes.map((ep, idx) => (
                <div 
                  key={ep.id} 
                  className="flex-none w-64 md:w-80 group cursor-pointer snap-start relative transition-transform duration-300 hover:scale-105 hover:z-30"
                  onClick={() => { setCurrentEpisode(ep); setView('player'); }}
                >
                  <div className="aspect-video bg-zinc-800 rounded overflow-hidden relative border border-zinc-800">
                    {ep.thumbnail ? (
                      <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon size={40}/></div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Play className="opacity-0 group-hover:opacity-100 text-white transition-opacity drop-shadow-md" size={48} fill="currentColor" />
                    </div>
                  </div>
                  <h3 className="mt-2 font-semibold text-zinc-300 group-hover:text-white transition-colors">{ep.title}</h3>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PlayerScreen = () => {
    const [mediaIndex, setMediaIndex] = useState(0);
    const media = currentEpisode?.media || [];
    const currentMedia = media[mediaIndex];

    const handleNext = () => {
      if (mediaIndex < media.length - 1) {
        setMediaIndex(mediaIndex + 1);
      } else {
        // Find next episode
        const currentIdx = episodes.findIndex(e => e.id === currentEpisode.id);
        if (currentIdx >= 0 && currentIdx < episodes.length - 1) {
          setCurrentEpisode(episodes[currentIdx + 1]);
          setMediaIndex(0);
        } else {
          setView('home'); // Finished all
        }
      }
    };

    const handlePrev = () => {
      if (mediaIndex > 0) {
        setMediaIndex(mediaIndex - 1);
      }
    };

    if (!currentEpisode || media.length === 0) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-zinc-400">No media found in this episode.</p>
            <button onClick={() => setView('home')} className="bg-zinc-800 px-6 py-2 rounded">Go Back</button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center group">
        {/* Top bar controls */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent">
          <button onClick={() => setView('home')} className="text-white hover:text-red-500 transition">
            <ChevronLeft size={36} />
          </button>
          <div className="text-center pointer-events-none text-white drop-shadow-md">
            <h2 className="font-bold text-xl">{currentEpisode.title}</h2>
            <p className="text-sm text-zinc-300">{mediaIndex + 1} / {media.length}</p>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Media Content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia.type === 'video' ? (
            <video 
              src={currentMedia.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-full object-contain"
              onEnded={handleNext}
            />
          ) : (
            <img 
              src={currentMedia.url} 
              alt="Memory" 
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        {/* Navigation Overlays */}
        {mediaIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-40"
          >
            <ChevronLeft size={32} />
          </button>
        )}
        
        <button 
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-40"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    );
  };

  const AdminScreen = () => {
    const [editingEp, setEditingEp] = useState(null);
    const [epForm, setEpForm] = useState({ title: '', thumbnail: '', media: [] });

    const handleSaveEpisode = async () => {
      try {
        const docId = editingEp ? editingEp.id : `ep-${Date.now()}`;
        const finalTitle = epForm.title || `EP ${episodes.length + 1}`;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'episodes', docId), {
          title: finalTitle,
          thumbnail: epForm.thumbnail,
          media: epForm.media
        });
        setEditingEp(null);
        setEpForm({ title: '', thumbnail: '', media: [] });
      } catch (err) {
        console.error(err);
      }
    };

    const handleDelete = async (id) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'episodes', id));
    };

    const addMediaRow = () => {
      setEpForm({ ...epForm, media: [...epForm.media, { type: 'image', url: '' }] });
    };

    const updateMedia = (idx, field, val) => {
      const newMedia = [...epForm.media];
      newMedia[idx][field] = val;
      setEpForm({ ...epForm, media: newMedia });
    };

    const removeMedia = (idx) => {
      const newMedia = [...epForm.media];
      newMedia.splice(idx, 1);
      setEpForm({ ...epForm, media: newMedia });
    };

    const saveSettings = async () => {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), siteSettings);
    };

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 p-4 md:p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Settings className="text-red-600" /> Studio Dashboard
            </h1>
            <button onClick={() => setView('home')} className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded hover:bg-zinc-700 transition">
              <Home size={18} /> View Site
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: List & Settings */}
            <div className="space-y-8">
              {/* Episodes List */}
              <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                <h2 className="text-xl font-bold mb-4 text-white">Episodes</h2>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {episodes.map(ep => (
                    <div key={ep.id} className="flex justify-between items-center p-3 bg-zinc-800 rounded group">
                      <span className="font-semibold">{ep.title}</span>
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingEp(ep); setEpForm(ep); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                        <button onClick={() => handleDelete(ep.id)} className="text-red-400 hover:text-red-300"><Trash size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {episodes.length === 0 && <p className="text-sm text-zinc-500">No episodes yet.</p>}
                </div>
                <button 
                  onClick={() => { setEditingEp(null); setEpForm({ title: `EP ${episodes.length + 1}`, thumbnail: '', media: [] }); }}
                  className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded flex items-center justify-center gap-2 transition"
                >
                  <Plus size={18} /> New Episode
                </button>
              </div>

              {/* Site Settings */}
              <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 space-y-4">
                <h2 className="text-xl font-bold text-white mb-2">Global Settings</h2>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Banner Image URL</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-800 p-2 rounded text-sm focus:ring-1 focus:ring-red-500" 
                    value={siteSettings.bannerImage || ''}
                    onChange={(e) => setSiteSettings({...siteSettings, bannerImage: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Viewer PIN</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-800 p-2 rounded text-sm text-center" 
                      value={siteSettings.viewerPin || ''}
                      onChange={(e) => setSiteSettings({...siteSettings, viewerPin: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Admin PIN</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-800 p-2 rounded text-sm text-center" 
                      value={siteSettings.adminPin || ''}
                      onChange={(e) => setSiteSettings({...siteSettings, adminPin: e.target.value})}
                    />
                  </div>
                </div>
                <button onClick={saveSettings} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded text-sm transition">
                  Save Settings
                </button>
              </div>
            </div>

            {/* Right Column: Editor */}
            <div className="lg:col-span-2">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h2 className="text-2xl font-bold mb-6 text-white border-b border-zinc-800 pb-2">
                  {editingEp ? 'Edit Episode' : 'Create Episode'}
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Episode Title</label>
                    <input 
                      type="text" 
                      placeholder="EP 1" 
                      className="w-full bg-zinc-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      value={epForm.title}
                      onChange={(e) => setEpForm({...epForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Thumbnail URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      className="w-full bg-zinc-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      value={epForm.thumbnail}
                      onChange={(e) => setEpForm({...epForm, thumbnail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-white">Media Timeline</h3>
                    <button onClick={addMediaRow} className="text-sm bg-zinc-800 px-3 py-1 rounded hover:bg-zinc-700 flex items-center gap-1">
                      <Plus size={14} /> Add Media
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {epForm.media.map((m, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-2 bg-zinc-800 p-3 rounded items-start md:items-center border border-zinc-700">
                        <div className="w-full md:w-32">
                          <select 
                            className="w-full bg-zinc-900 p-2 rounded text-sm"
                            value={m.type}
                            onChange={(e) => updateMedia(idx, 'type', e.target.value)}
                          >
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Direct URL to media file"
                          className="flex-1 bg-zinc-900 p-2 rounded text-sm w-full"
                          value={m.url}
                          onChange={(e) => updateMedia(idx, 'url', e.target.value)}
                        />
                        <button onClick={() => removeMedia(idx)} className="text-red-400 hover:text-red-300 p-2 bg-zinc-900 rounded">
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                    {epForm.media.length === 0 && (
                      <div className="text-center p-8 border-2 border-dashed border-zinc-700 rounded text-zinc-500">
                        No media added. Click "Add Media" to start building this episode.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleSaveEpisode} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold transition flex-1">
                    {editingEp ? 'Update Episode' : 'Publish Episode'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- ROUTER ---
  return (
    <>
      {view === 'locked' && <LockScreen />}
      {view === 'home' && <HomeScreen />}
      {view === 'player' && <PlayerScreen />}
      {view === 'admin' && <AdminScreen />}
    </>
  );
}