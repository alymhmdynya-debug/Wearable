/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  useParams, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { Sparkles, Trophy, User as UserIcon, LogIn, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';

import LuxuryBackground from './components/LuxuryBackground';
import PWAInstallBar from './components/PWAInstallBar';
import UserProfileCard from './components/UserProfileCard';
import VIPDashboard from './components/VIPDashboard';
import { getProfileByUsername, getAppConfig } from './services/db';
import { UserProfile } from './types';
import { isStandaloneMode, updateDynamicManifestAndFavicon, getSavedProfile } from './utils/pwa';

function ProfileRouteWrapper() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    let isSubscribed = true;
    setLoading(true);

    getProfileByUsername(username)
      .then((res) => {
        if (isSubscribed) {
          setProfile(res);
          setLoading(false);
          // Dynamically rewrite Manifest and Title based on visited profile card
          updateDynamicManifestAndFavicon(res);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setProfile(null);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono text-[#D4AF37] uppercase select-none tracking-widest">تأمين الاتصال الملكي بـ {username}...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 flex flex-col justify-center min-h-[80vh] text-center text-white">
        <div className="bg-black/90 border border-[#D4AF37]/30 rounded-[24px] p-6 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.8)]">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif text-gold font-bold mb-2">عضو غير مسجل</h2>
          <p className="text-xs text-neutral-400 leading-relaxed mb-6">
            عذراً، معرّف الحساب <span className="text-[#D4AF37] font-mono font-bold">"@{username}"</span> غير مسجل في قوائم كبار الشخصيات VIP لماركة إسمي ذهب.
          </p>

          <button
            onClick={() => navigate('/apps')}
            className="w-full py-3 px-4 rounded-xl bg-gold-gradient text-black font-serif font-bold text-xs hover:opacity-95 transition-all shadow-md min-h-[44px]"
          >
            سجّل واحجز بطاقتك الملكية فوراً 🏆
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserProfileCard 
      profile={profile} 
      onGoToDashboard={() => navigate('/apps')} 
    />
  );
}

function WelcomeHome() {
  const navigate = useNavigate();
  
  // Custom automated redirect or standalone layout lock
  useEffect(() => {
    const cachedProfile = getSavedProfile();
    
    // If we have a cached user locally and are in standalone panel, lock the route immediately
    if (isStandaloneMode() && cachedProfile && cachedProfile.username) {
      navigate(`/${cachedProfile.username}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="w-full max-w-sm mx-auto p-4 flex flex-col justify-center min-h-[80vh] text-center text-white">
      <div className="relative rounded-[28px] overflow-hidden bg-black/85 border border-[#D4AF37]/25 p-6 backdrop-blur-3xl shadow-[0_24px_64px_rgba(212,175,55,0.05)] text-center">
        <div className="absolute inset-0 bg-radial-gradient from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-1.5 select-none text-[#D4AF37]/50 text-[10px] uppercase font-serif tracking-[0.25em]">
            <span>OFFICIAL BRAND APP</span>
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-serif font-black text-gold mt-4">إسمي ذهب</h1>
          <p className="text-xs text-neutral-400 mt-1.5 uppercase font-mono tracking-widest font-semibold">ESMY DAHAB</p>
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-3.5" />
        </div>

        <p className="text-sm font-sans text-neutral-300 leading-relaxed mb-6 px-1">
          عالم مفعم بالفخامة المطلقة والأناقة العربية المذهبة. احصل على بطاقتك الملكية الشخصية ورصيد الموصين والمتابعة الفورية.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/apps')}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gold-gradient text-black font-serif font-bold text-xs hover:opacity-95 shadow-[0_4px_20px_rgba(212,175,55,0.2)] transition-all min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            <span>لوحة تحكم كبار الشخصيات VIP 👑</span>
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 font-mono tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/65" />
          <span>SECURE SECURE CLOUD GATEWAY</span>
        </div>
      </div>
    </div>
  );
}

function MainAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide header/footer if launched directly from standalone (PWA add-to-home mode)
  const isPwa = isStandaloneMode();

  useEffect(() => {
    // Determine current path username to check if we are visiting a specific user card
    const parts = location.pathname.split('/');
    const currentUsername = parts[parts.length - 1];

    // Synchronize global app config & default branding icons on first load
    getAppConfig().then((config) => {
      if (config) {
        localStorage.setItem('esm_config_stage1', config.stage1IconUrl || '');
        localStorage.setItem('esm_config_stage2', config.stage2IconUrl || '');
        localStorage.setItem('esm_config_stage3', config.stage3IconUrl || '');
        
        if (!currentUsername || currentUsername === 'apps') {
          // If we are on Home page or Dashboard, update metadata based on the general brand
          const saved = getSavedProfile();
          updateDynamicManifestAndFavicon(saved);
        }
      }
    }).catch((err) => {
      console.warn("Could not retrieve config/app initially:", err);
    });

    if (!currentUsername || currentUsername === 'apps') {
      const saved = getSavedProfile();
      updateDynamicManifestAndFavicon(saved);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-[#050505] text-[#E0E0E0]">
      {/* Dynamic particles background canvas */}
      <LuxuryBackground />

      {/* Radial-gradients glow overlay from Elegant Dark Design HTML */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 20% 30%, #D4AF37 0%, transparent 40%), radial-gradient(circle at 80% 70%, #D4AF37 0%, transparent 40%)', 
          filter: 'blur(80px)' 
        }}
      />

      {/* Global Deluxe Top Header Bar aligned with "Elegant Dark" design theme */}
      {!isPwa && (
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#D4AF37]/25 z-25 bg-black/45 backdrop-blur-md select-none relative">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-98 transition-all"
          >
            <div className="w-8 h-8 rounded-full border border-[#D4AF37]/60 flex items-center justify-center bg-[#111]">
              <span className="text-[#D4AF37] font-serif font-bold text-base leading-none">D</span>
            </div>
            <h1 className="font-serif text-sm tracking-wider text-[#D4AF37] uppercase font-bold flex items-center gap-2">
              ESMY DAHAB
              <span className="text-[12px] opacity-70 font-sans">إسمي ذهب</span>
            </h1>
          </div>
          
          <div className="flex gap-4 items-center text-[11px] uppercase tracking-wider font-semibold relative z-10 text-right">
            <button
              onClick={() => navigate('/')}
              className="cursor-pointer text-neutral-400 hover:text-[#D4AF37] transition-colors"
            >
              الرئيسية
            </button>
            <div className="w-px h-4 bg-[#D4AF37]/35" />
            <button
              onClick={() => navigate('/apps')}
              className="text-[#D4AF37] hover:brightness-110 uppercase font-bold cursor-pointer"
            >
              لوحة VIP
            </button>
          </div>
        </header>
      )}

      {/* Primary Route Screen with Transition layout wrapper */}
      <main className="flex-grow flex items-center justify-center w-full relative z-10">
        <Routes location={location}>
          <Route path="/" element={<WelcomeHome />} />
          <Route path="/apps" element={<VIPDashboard onBackToCard={(uname) => navigate(`/${uname}`)} />} />
          <Route path="/:username" element={<ProfileRouteWrapper />} />
        </Routes>
      </main>

      {/* Custom installer trigger bar */}
      <PWAInstallBar />

      {/* Global Minimalist Anti-AI-Slop Footer (Hidden in standalone) */}
      {!isPwa && (
        <footer className="w-full py-4 border-t border-[#D4AF37]/10 bg-black/20 text-center select-none relative z-10">
          <p className="text-[10px] font-serif text-neutral-500 uppercase tracking-[0.25em]">
            © {new Date().getFullYear()} ESMY DAHAB • جميع الحقوق محفوظة لعلامة الأناقة الفاخرة
          </p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainAppLayout />
    </BrowserRouter>
  );
}
