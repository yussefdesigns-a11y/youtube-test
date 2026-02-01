
import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, Upload, Youtube, Sparkles, CheckCircle2, Layout, 
  Type as TypeIcon, Image as ImageIcon, Clock, Eye, X, User, 
  Zap, LogIn, LogOut, ShieldCheck, BarChart3, Star
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { VideoDetails, ScorecardItem, AnalysisLength } from './types';
import { suggestTitles, analyzeThumbnailScorecard } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [details, setDetails] = useState<VideoDetails>({
    title: 'How to Build a Professional YouTube Thumbnail Previewer',
    channelName: 'Creative Studio',
    views: '1.2M',
    uploadDate: '2 hours ago',
    thumbnailUrl: 'https://picsum.photos/1280/720',
    avatarUrl: 'https://picsum.photos/100/100',
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

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'avatarUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDetails(prev => ({ ...prev, [field]: reader.result as string }));
        if (field === 'thumbnailUrl') {
          setSuggestions([]);
          setScorecard([]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!details.thumbnailUrl.startsWith('data:')) return alert("Upload a thumbnail first!");
    setIsGenerating(true);
    try {
      const [titles, sc] = await Promise.all([
        suggestTitles(details.thumbnailUrl),
        analyzeThumbnailScorecard(details.thumbnailUrl, analysisLength)
      ]);
      setSuggestions(titles);
      setScorecard(sc);
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
      link.download = `yt-preview-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-white font-['Inter']">
      {/* Sidebar */}
      <div className="w-full md:w-[440px] border-r border-white/5 bg-[#0f0f0f] flex flex-col overflow-hidden shadow-2xl z-20">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="text-red-600 w-8 h-8" />
            <h1 className="text-lg font-bold tracking-tight">Studio Pro</h1>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="User" />
              <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full text-gray-400"><LogOut size={18}/></button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 transition-all">
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>

        {/* Editor Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Section: Video Metadata */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Video Content</h3>
            <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 flex items-center gap-2"><TypeIcon size={12}/> Title</label>
                <textarea 
                  value={details.title}
                  onChange={e => setDetails({...details, title: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600 outline-none resize-none h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-2"><Layout size={12}/> Channel</label>
                  <input 
                    type="text" value={details.channelName} 
                    onChange={e => setDetails({...details, channelName: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-2"><ShieldCheck size={12}/> Status</label>
                  <button onClick={() => setDetails({...details, isVerified: !details.isVerified})} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${details.isVerified ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                    {details.isVerified ? 'Verified' : 'Standard'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Uploads */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Media Assets</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="group relative aspect-video bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-red-600/50 transition-all">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'thumbnailUrl')} />
                {details.thumbnailUrl.startsWith('data:') ? (
                  <img src={details.thumbnailUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-1">
                    <ImageIcon size={20} />
                    <span className="text-[10px] font-bold uppercase">Thumbnail</span>
                  </div>
                )}
              </label>
              <label className="group relative aspect-video bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-red-600/50 transition-all">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'avatarUrl')} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                    <img src={details.avatarUrl} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase">Profile Pic</span>
                </div>
              </label>
            </div>
          </div>

          {/* AI Settings */}
          <div className="pt-4 border-t border-white/5 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Analysis Depth</h3>
                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">AI Powered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                {(['short', 'medium', 'long'] as AnalysisLength[]).map(l => (
                  <button 
                    key={l} onClick={() => setAnalysisLength(l)}
                    className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${analysisLength === l ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-500 hover:text-white'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={runAnalysis}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-red-600/10"
            >
              {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap size={18}/> Generate Scorecard</>}
            </button>
          </div>

          {/* Results Scorecard (Thumbnail Format) */}
          {scorecard.length > 0 && (
            <div className="space-y-4 pb-8">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400">Thumbnail Health Report</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {scorecard.map((item, i) => (
                  <div key={i} className="group relative bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 hover:border-emerald-500/30 transition-all overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">{item.category}</span>
                      <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                        <Star size={12} fill="currentColor" /> {item.strengthScore}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.description}</p>
                    <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
                      <div className="h-full bg-emerald-500" style={{ width: `${item.strengthScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Title Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Viral Title Ideas</h3>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setDetails({...details, title: s})} className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs text-gray-400 hover:text-white transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505] overflow-y-auto">
        <div className="w-full max-w-[840px] space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white mb-1">Live Feed Preview</h2>
              <p className="text-sm text-gray-500">Real-time simulation of the YouTube browsing experience.</p>
            </div>
            <button 
              onClick={downloadPreview}
              className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-all shadow-2xl hover:scale-105 active:scale-95"
            >
              <Download size={18} /> Export Image
            </button>
          </div>

          <div 
            ref={previewRef}
            className="bg-[#0f0f0f] rounded-[32px] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5"
          >
            <div className="flex flex-col gap-6">
              <div className="relative group overflow-hidden rounded-[24px] border border-white/10 shadow-2xl">
                <img src={details.thumbnailUrl} className="w-full aspect-video object-cover" />
                <div className="absolute bottom-4 right-4 bg-black/90 text-white text-[10px] font-black px-2 py-1 rounded-md tracking-tighter">10:45</div>
              </div>
              <div className="flex gap-4 px-1">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                  <img src={details.avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[19px] font-bold leading-tight line-clamp-2 youtube-font text-gray-100">{details.title}</h3>
                  <div className="text-sm text-[#aaaaaa] flex flex-col gap-0.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{details.channelName}</span>
                      {details.isVerified && <CheckCircle2 size={14} className="fill-[#aaaaaa] text-[#0f0f0f]" />}
                    </div>
                    <div>{details.views} views • {details.uploadDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6">
             {[
               { icon: <ImageIcon size={18}/>, label: "Ratio", val: "16:9" },
               { icon: <BarChart3 size={18}/>, label: "Score", val: "High CTR" },
               { icon: <ShieldCheck size={18}/>, label: "Format", val: "PNG" }
             ].map((stat, i) => (
               <div key={i} className="bg-[#111] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                 <div className="text-red-500">{stat.icon}</div>
                 <div>
                   <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</div>
                   <div className="text-sm font-bold">{stat.val}</div>
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
