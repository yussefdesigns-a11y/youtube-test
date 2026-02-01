
import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, Upload, Youtube, Sparkles, CheckCircle2, Layout, 
  Type as TypeIcon, Image as ImageIcon, Clock, Eye, X, User, 
  Zap, LogIn, LogOut, ShieldCheck, BarChart3, Star, TrendingUp,
  History, Save, Palette, Focus, MousePointer2
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { auth, googleProvider, storage, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { VideoDetails, ScorecardItem, AnalysisLength } from './types';
import { suggestTitles, analyzeThumbnailScorecard } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [details, setDetails] = useState<VideoDetails>({
    title: 'How to Build a Professional YouTube Thumbnail Previewer',
    channelName: 'Creative Studio',
    views: '1.2M',
    uploadDate: '2 hours ago',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1280',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
    isVerified: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [scorecard, setScorecard] = useState<ScorecardItem[]>([]);
  const [analysisLength, setAnalysisLength] = useState<AnalysisLength>('short');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Auth failed:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'avatarUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setDetails(prev => ({ ...prev, [field]: base64 }));
      
      if (user) {
        try {
          const storageRef = ref(storage, `users/${user.uid}/${field === 'thumbnailUrl' ? 'thumbnails' : 'avatars'}/${Date.now()}`);
          await uploadString(storageRef, base64, 'data_url');
          console.log(`${field} backed up to Firebase.`);
        } catch (err) {
          console.warn("Storage upload failed (likely PLACEHOLDER keys):", err);
        }
      }
      
      if (field === 'thumbnailUrl') {
        setSuggestions([]);
        setScorecard([]);
      }
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!details.thumbnailUrl.startsWith('data:')) {
      alert("Please upload a custom thumbnail from your device first!");
      return;
    }
    setIsGenerating(true);
    try {
      const [titles, sc] = await Promise.all([
        suggestTitles(details.thumbnailUrl),
        analyzeThumbnailScorecard(details.thumbnailUrl, analysisLength)
      ]);
      setSuggestions(titles);
      setScorecard(sc);

      if (user) {
        try {
          await addDoc(collection(db, 'designs'), {
            userId: user.uid,
            details,
            scorecard: sc,
            timestamp: new Date()
          });
        } catch (err) {
          console.warn("Firestore save failed:", err);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPreview = async () => {
    if (previewRef.current) {
      const dataUrl = await htmlToImage.toPng(previewRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `yt-studio-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'composition': return <Focus size={16} />;
      case 'color': return <Palette size={16} />;
      case 'text': return <TypeIcon size={16} />;
      case 'impact': return <TrendingUp size={16} />;
      default: return <Star size={16} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-white font-['Inter']">
      {/* Sidebar - Control Panel */}
      <div className="w-full md:w-[460px] border-r border-white/5 bg-[#0a0a0a] flex flex-col overflow-hidden shadow-2xl">
        {/* Nav Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#0a0a0a] to-[#111]">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shadow-red-600/20">
              <Youtube className="text-white w-6 h-6" />
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase">Studio<span className="text-red-600">Pro</span></h1>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="group relative">
                <img src={user.photoURL || ''} className="w-9 h-9 rounded-full border border-white/10 ring-2 ring-red-600/20 group-hover:ring-red-600 transition-all" alt="User" />
                <button onClick={() => signOut(auth)} className="absolute -bottom-1 -right-1 bg-[#1a1a1a] p-1 rounded-full border border-white/10 text-gray-400 hover:text-white"><LogOut size={10}/></button>
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-xs font-black hover:bg-gray-200 transition-all active:scale-95">
              <LogIn size={14} /> SIGN IN
            </button>
          )}
        </div>

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0a0a0a]">
          {/* Metadata Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Video Settings</h3>
              <div className="h-px flex-1 mx-4 bg-white/5"></div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 group">
                <label className="text-[11px] font-bold text-gray-500 flex items-center gap-2 group-focus-within:text-red-500 transition-colors uppercase">
                  <TypeIcon size={12}/> Title Overlay
                </label>
                <textarea 
                  value={details.title}
                  onChange={e => setDetails({...details, title: e.target.value})}
                  className="w-full bg-[#111] border border-white/5 rounded-2xl p-4 text-sm focus:border-red-600/50 outline-none resize-none h-24 transition-all"
                  placeholder="The text that appears in your title..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase"><Layout size={12}/> Channel</label>
                  <input 
                    type="text" value={details.channelName} 
                    onChange={e => setDetails({...details, channelName: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 rounded-xl p-3 text-sm focus:border-red-600/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase"><ShieldCheck size={12}/> Verified</label>
                  <button onClick={() => setDetails({...details, isVerified: !details.isVerified})} className={`w-full py-3 rounded-xl text-xs font-black transition-all border ${details.isVerified ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                    {details.isVerified ? 'VERIFIED' : 'PENDING'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Media Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Media Assets</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="group relative aspect-video bg-[#111] border-2 border-dashed border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-red-600/50 transition-all flex items-center justify-center">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'thumbnailUrl')} />
                {details.thumbnailUrl.startsWith('data:') ? (
                  <img src={details.thumbnailUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-red-500 transition-colors">
                    <ImageIcon size={24} />
                    <span className="text-[10px] font-black uppercase">Upload Video Image</span>
                  </div>
                )}
              </label>
              <label className="group relative aspect-video bg-[#111] border-2 border-dashed border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-red-600/50 transition-all flex items-center justify-center">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'avatarUrl')} />
                <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-red-500 transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-[#050505]">
                    <img src={details.avatarUrl} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black uppercase">User Avatar</span>
                </div>
              </label>
            </div>
          </section>

          {/* AI Workbench */}
          <section className="pt-6 border-t border-white/5 space-y-6">
            <div className="space-y-4 bg-red-950/10 p-5 rounded-[24px] border border-red-900/10">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">AI Workbench</h3>
                <Sparkles size={14} className="text-red-500 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl">
                  {(['short', 'medium', 'long'] as AnalysisLength[]).map(l => (
                    <button 
                      key={l} onClick={() => setAnalysisLength(l)}
                      className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${analysisLength === l ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={runAnalysis}
                  disabled={isGenerating}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-[0.98] transition-all shadow-2xl shadow-white/5"
                >
                  {isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Zap size={18}/> ANALYZE THUMBNAIL</>}
                </button>
              </div>
            </div>

            {/* AI Results - Visual Scorecard */}
            {scorecard.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <BarChart3 size={16} className="text-emerald-500" />
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Health Scorecard</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {scorecard.map((item, i) => (
                    <div key={i} className="group relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                      {/* Mini Thumbnail Format */}
                      <div className="flex p-4 gap-4">
                        <div className="w-20 h-12 rounded-lg bg-[#1a1a1a] flex flex-col items-center justify-center text-emerald-500 border border-emerald-500/10 flex-shrink-0">
                          {getIcon(item.iconType)}
                          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">{item.strengthScore}%</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{item.category}</span>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 italic">"{item.description}"</p>
                        </div>
                      </div>
                      <div className="h-0.5 w-full bg-emerald-500/10">
                        <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${item.strengthScore}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Results - Titles */}
            {suggestions.length > 0 && (
              <div className="space-y-4 pb-12">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Suggested Titles</h3>
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => setDetails({...details, title: s})} 
                      className="w-full text-left p-4 bg-[#111] hover:bg-white/5 border border-white/5 rounded-2xl text-xs text-gray-400 hover:text-white transition-all group flex items-start gap-3"
                    >
                      <span className="text-red-600 font-black mt-0.5">#{i+1}</span>
                      <span className="leading-relaxed">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-[#050505] overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="w-full max-w-[900px] z-10 space-y-12">
          {/* Top Bar Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-white mb-1">Live Feed</h2>
              <p className="text-sm text-gray-500">Previewing exactly as users see on mobile and desktop.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={downloadPreview}
                className="bg-white text-black px-10 py-4 rounded-full font-black text-sm flex items-center gap-3 hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                <Download size={18} /> EXPORT PNG
              </button>
            </div>
          </div>

          {/* Device Mockup */}
          <div 
            ref={previewRef}
            className="bg-[#0f0f0f] rounded-[48px] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5"
          >
            <div className="flex flex-col gap-8">
              {/* Image Container */}
              <div className="relative group overflow-hidden rounded-[32px] border border-white/10 shadow-2xl">
                <img src={details.thumbnailUrl} className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute bottom-6 right-6 bg-black/95 text-white text-[11px] font-black px-2.5 py-1 rounded-lg tracking-tighter border border-white/10">10:45</div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              {/* Metadata Container */}
              <div className="flex gap-5 px-2">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/5 shadow-xl">
                  <img src={details.avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-2xl font-bold leading-[1.2] line-clamp-2 youtube-font text-gray-50 tracking-tight antialiased">
                    {details.title}
                  </h3>
                  <div className="text-base text-[#aaaaaa] flex flex-col gap-0.5 font-medium tracking-tight">
                    <div className="flex items-center gap-2">
                      <span className="hover:text-white transition-colors cursor-pointer">{details.channelName}</span>
                      {details.isVerified && <CheckCircle2 size={16} className="fill-[#aaaaaa] text-[#0f0f0f]" />}
                    </div>
                    <div className="flex items-center">
                      <span>{details.views} views</span>
                      <span className="mx-2 opacity-50">•</span>
                      <span>{details.uploadDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2 opacity-30 hover:opacity-100 transition-opacity">
                  <MousePointer2 size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Benchmarks */}
          <div className="grid grid-cols-3 gap-8">
             {[
               { icon: <History size={20}/>, label: "History", val: "Autosaved" },
               { icon: <ShieldCheck size={20}/>, label: "Policy", val: "Safe Content" },
               { icon: <Save size={20}/>, label: "Cloud", val: user ? "Connected" : "Guest Mode" }
             ].map((stat, i) => (
               <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-[28px] flex items-center gap-5 hover:bg-white/[0.04] transition-all group">
                 <div className="text-red-600 p-3 bg-red-600/10 rounded-2xl group-hover:scale-110 transition-transform">{stat.icon}</div>
                 <div>
                   <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{stat.label}</div>
                   <div className="text-sm font-black mt-0.5 tracking-tight">{stat.val}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
