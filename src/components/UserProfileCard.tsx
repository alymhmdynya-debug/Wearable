import { useState, useEffect } from 'react';
import { Heart, Sparkles, Trophy, Award, Crown, ArrowLeft, Star, Share2 } from 'lucide-react';
import { UserProfile } from '../types';
import { toggleLikeProfile, hasLikedProfile, recordReferral } from '../services/db';

interface UserProfileCardProps {
  profile: UserProfile;
  onGoToDashboard?: () => void;
}

export default function UserProfileCard({ profile, onGoToDashboard }: UserProfileCardProps) {
  const [likesCount, setLikesCount] = useState(profile.likes);
  const [liked, setLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    setLikesCount(profile.likes);
    setLiked(hasLikedProfile(profile.username));
  }, [profile]);

  // Triggers organic referral recording on visitor landing
  useEffect(() => {
    const visitorId = localStorage.getItem('esm_visitor_id') || `vis_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('esm_visitor_id', visitorId);
    
    // Attempt to record entry referral once
    recordReferral(profile.username, visitorId);
  }, [profile.username]);

  const handleLikeTap = async () => {
    if (loadingLike) return;
    setLoadingLike(true);
    const prevLiked = liked;
    const cleanUsername = profile.username.toLowerCase();
    
    // Optimistic UI update
    setLiked(!prevLiked);
    setLikesCount(prev => prev + (prevLiked ? -1 : 1));

    try {
      if (profile.id) {
        await toggleLikeProfile(profile.id, cleanUsername, !prevLiked);
      }
    } catch (err) {
      // Revert in case of failure
      setLiked(prevLiked);
      setLikesCount(prev => prev + (prevLiked ? 1 : -1));
    } finally {
      setLoadingLike(false);
    }
  };

  const getTierMetadata = (level: number) => {
    switch (level) {
      case 3:
        return {
          title: 'الذهبي الملكي',
          sub: 'Royal Gold Member',
          frameGradient: 'from-[#BF953F] via-[#FCF6BA] to-[#AA771C]',
          textStyle: 'text-gold font-bold',
          badgeBg: 'bg-gold-gradient text-black',
          glow: 'shadow-[0_0_35px_rgba(212,175,55,0.45)]',
          crownColor: 'text-[#D4AF37]',
          labelAr: 'الفئة الذهبية 👑',
        };
      case 2:
        return {
          title: 'الفضي الفاخر',
          sub: 'Platinum Silver Member',
          frameGradient: 'from-[#888888] via-[#F0F0F0] to-[#555555]',
          textStyle: 'text-silver font-semibold',
          badgeBg: 'bg-silver-gradient text-black',
          glow: 'shadow-[0_0_25px_rgba(255,255,255,0.25)]',
          crownColor: 'text-[#C0C0C0]',
          labelAr: 'الفئة الفضية 🥈',
        };
      default:
        return {
          title: 'البرونزي العريق',
          sub: 'Bronze Member',
          frameGradient: 'from-[#8C3F10] via-[#F5D6C6] to-[#592606]',
          textStyle: 'text-bronze font-medium',
          badgeBg: 'bg-bronze-gradient text-white',
          glow: 'shadow-[0_0_20px_rgba(205,127,50,0.2)]',
          crownColor: 'text-[#CD7F32]',
          labelAr: 'الفئة البرونزية 🥉',
        };
    }
  };

  const tier = getTierMetadata(profile.level);

  const handleShare = () => {
    const url = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      })
      .catch((err) => console.error("Clipboard copy failed", err));
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-center min-h-[90vh]">
      {/* floating notification */}
      {showNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-black/95 border border-[#D4AF37] text-[#D4AF37] rounded-xl text-xs font-serif shadow-[0_0_24px_rgba(212,175,55,0.4)] animate-fade-in text-center">
          تم نسخ رابط المشاركة الفاخر الخاص بك
        </div>
      )}

      {/* Luxury Float Card in Elegant Dark Theme */}
      <div 
        className="w-full relative mt-8 rounded-[40px] overflow-hidden bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-[#D4AF37]/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col transition-all duration-500"
      >
        {/* Glow overlay from Design HTML */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none" />

        {/* Content wrapper */}
        <div className="p-6 pt-8 text-center flex-1 flex flex-col items-center">
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-1.5 select-none">
              <span className="text-[10px] tracking-[0.2em] text-[#D4AF37]/70 uppercase font-serif">ESMY DAHAB</span>
              <Star className="w-2.5 h-2.5 text-[#D4AF37] fill-[#D4AF37]" />
            </div>
            <h1 className="text-xl font-bold font-serif text-gold tracking-widest mt-1">
              إسمي ذهب
            </h1>
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/45 to-transparent mt-1.5" />
          </div>

          {/* Member Avatar Image Frame of "Elegant Dark" design structure */}
          <div className="relative mb-6 mt-4">
            {/* Elegant static tilted crown top-left of avatar container */}
            <div className="absolute -top-3.5 -left-3 -rotate-[22deg] z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
              <Crown className={`w-9 h-9 ${tier.crownColor} fill-current/10`} />
            </div>
            
            <div className={`w-36 h-36 rounded-full p-1 bg-gradient-to-tr ${tier.frameGradient} shadow-xl ${tier.glow}`}>
              <div className="w-full h-full rounded-full border-4 border-[#0A0A0A] bg-[#222] flex items-center justify-center overflow-hidden">
                {profile.photoUrl ? (
                  <img 
                    src={profile.photoUrl} 
                    alt={profile.displayName}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-[#D4AF37] font-serif text-5xl">
                    {profile.displayName.substring(0, 1)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Dynamic Level label matched precisely to theme style */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black text-[9px] font-sans font-bold px-3 py-1 rounded-full border-2 border-[#0A0A0A] uppercase tracking-wider select-none whitespace-nowrap">
              {tier.title}
            </div>
          </div>

          {/* Personal Details with typography and colors from Design style */}
          <h2 className="font-serif text-3xl text-white mb-2 font-bold">
            {profile.displayName}
          </h2>
          <p className="text-[#D4AF37]/80 text-xs font-mono tracking-widest direction-ltr mb-3 select-all">
            @{profile.username}
          </p>
          
          <p className="text-[#D4AF37]/90 text-sm font-light text-center px-4 leading-relaxed italic mb-8 max-w-sm">
            "{profile.bio || 'الفخامة ليست خياراً، بل هي هوية. أهلاً بكم في عالمي المذهب.'}"
          </p>

          {/* Buttons structured exactly as requested in mock-up style */}
          <div className="w-full space-y-4">
            {/* Primary Gold CTA */}
            <a
              href={`https://esmydahab.com?ref=${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#D4AF37] text-[#050505] rounded-2xl font-bold flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-[0_8px_20px_rgba(212,175,55,0.3)] font-serif text-xs cursor-pointer hover:brightness-110 min-h-[44px]"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>اطلب قطعتك المذهبة الآن 🏆</span>
            </a>

            {/* Split layout: Likes button & Copy trigger button */}
            <div className="flex gap-3">
              <button 
                onClick={handleLikeTap}
                disabled={loadingLike}
                className={`flex-1 py-4 bg-[#1A1A1A] border rounded-2xl flex flex-col items-center justify-center group transition-all duration-200 cursor-pointer ${
                  liked 
                    ? 'border-red-500/50 text-red-500 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                    : 'border-[#D4AF37]/20 text-[#E0E0E0] hover:border-[#D4AF37]/50'
                }`}
              >
                <span className={`text-xl mb-1 ${liked ? 'scale-110' : ''}`}>{liked ? '❤️' : '🤍'}</span>
                <span className="text-[10px] font-mono tracking-tighter opacity-60 uppercase">{likesCount} Likes</span>
              </button>

              <button 
                onClick={handleShare}
                className="flex-1 py-4 bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-2xl flex flex-col items-center justify-center hover:border-[#D4AF37]/50 transition-all duration-200 cursor-pointer text-[#E0E0E0]"
              >
                <span className="text-[#D4AF37] text-xl mb-1">🔗</span>
                <span className="text-[10px] font-mono tracking-tighter opacity-60 uppercase">Copy Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Brand visual bottom stats bar representation */}
        <div className="p-6 bg-black/40 border-t border-[#D4AF37]/10 flex justify-between items-center rounded-b-[40px]">
          <div className="flex -space-x-1.5 select-none">
            <div className="w-8 h-8 rounded-full bg-[#111] border border-black flex items-center justify-center text-[9px] font-bold text-[#D4AF37]">VIP</div>
            <div className="w-8 h-8 rounded-full bg-[#222] border border-black flex items-center justify-center text-[9px] font-bold text-gray-400">GOLD</div>
            <div className="w-8 h-8 rounded-full bg-[#333] border border-black flex items-center justify-center text-[9px] font-bold text-gray-500">⚜️</div>
          </div>
          <p className="text-[10px] text-[#D4AF37]/60 font-mono uppercase tracking-wider select-none">
            REFERRALS TRACKED: {profile.referralCount || 0}
          </p>
        </div>
      </div>

      {/* Luxury Footer Navigation to Dashboard */}
      {onGoToDashboard && (
        <button
          onClick={onGoToDashboard}
          className="mt-6 mx-auto flex items-center gap-2 text-xs text-[#D4AF37]/75 hover:text-[#D4AF37] transition-colors py-2 px-5 rounded-full bg-black/40 border border-[#D4AF37]/20 shadow-md min-h-[44px] cursor-pointer"
        >
          <span>لوحة تحكم كبار الشخصيات VIP 👑</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
