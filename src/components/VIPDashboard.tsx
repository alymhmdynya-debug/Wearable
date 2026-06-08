import React, { useState, useEffect } from 'react';
import { 
  doc, 
  setDoc, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Sparkles, 
  LogOut, 
  Trophy, 
  Share2, 
  Check, 
  Copy, 
  Edit3, 
  User as UserIcon, 
  Image as ImageIcon, 
  Layers, 
  Award,
  Crown,
  ChevronLeft,
  ArrowRight,
  UserCheck,
  Zap
} from 'lucide-react';

import { db, auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { UserProfile, RoyalLevel } from '../types';
import { 
  listenToProfile, 
  getLeaderboard, 
  getAccessCode, 
  getProfileByAccessCode, 
  claimAccessCode, 
  getAppConfig,
  getProfileByUsername,
  getProfileByUID,
  autoSyncVipAppUrl
} from '../services/db';
import { updateDynamicManifestAndFavicon, saveProfileLocal, getSavedProfile } from '../utils/pwa';

interface VIPDashboardProps {
  onBackToCard?: (username: string) => void;
}

export default function VIPDashboard({ onBackToCard }: VIPDashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(getSavedProfile());
  const [loading, setLoading] = useState(true);
  
  // Login input states
  const [enteredCode, setEnteredCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // Registration States (when verified code is pristine of users)
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [tempAccessCode, setTempAccessCode] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regArabicName, setRegArabicName] = useState('');
  const [regEnglishName, setRegEnglishName] = useState('');
  const [regAppName, setRegAppName] = useState('إسمي ذهب');
  const [regPhone, setRegPhone] = useState('');
  const [tempProduct, setTempProduct] = useState('premium');
  const [regBio, setRegBio] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);

  // Level Stage Configuration Assets
  const [levelAssets, setLevelAssets] = useState<{ stage1IconUrl: string; stage2IconUrl: string; stage3IconUrl: string }>({
    stage1IconUrl: '',
    stage2IconUrl: '',
    stage3IconUrl: ''
  });

  // Editing profile details
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editArabicName, setEditArabicName] = useState('');
  const [editEnglishName, setEditEnglishName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAppName, setEditAppName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPicFile, setEditPicFile] = useState<File | null>(null);
  const [editError, setEditError] = useState('');
  const [editLikes, setEditLikes] = useState<number>(0);
  const [editReferralCount, setEditReferralCount] = useState<number>(0);
  const [editLevel, setEditLevel] = useState<number>(1);

  // Celebration States
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationNewLevel, setCelebrationNewLevel] = useState<number>(1);

  // UI States
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch live configurations, and load local login sessions using document lookup
  useEffect(() => {
    // A: Fetch Level Badge links from custom config
    const loadConfig = async () => {
      const config = await getAppConfig();
      if (config) {
        setLevelAssets({
          stage1IconUrl: config.stage1IconUrl || '',
          stage2IconUrl: config.stage2IconUrl || '',
          stage3IconUrl: config.stage3IconUrl || '',
        });
      }
      
      // Auto sync current origin URL to DB as vipAppUrl if it has changed
      try {
        await autoSyncVipAppUrl();
      } catch (err) {
        console.warn("Auto sync failed:", err);
      }
    };
    loadConfig();

    // B: Resolve active login session based on saved code
    const loadSavedSession = async () => {
      const cached = getSavedProfile();
      const savedCode = localStorage.getItem('esm_code') || localStorage.getItem('esm_active_access_code') || cached?.accessCode;

      if (savedCode) {
        const cleanCode = savedCode.trim().toUpperCase();
        try {
          const profileFetched = await getProfileByAccessCode(cleanCode);
          if (profileFetched) {
            setProfile(profileFetched);
            saveProfileLocal(profileFetched);
            updateDynamicManifestAndFavicon(profileFetched);
          } else if (cached) {
            // Keep local offline cache if database fetch fails/offline
            setProfile(cached);
            updateDynamicManifestAndFavicon(cached);
          }
        } catch (err) {
          console.warn("Could not sync profile session live on load:", err);
          if (cached) {
            setProfile(cached);
            updateDynamicManifestAndFavicon(cached);
          }
        }
      } else if (cached) {
        setProfile(cached);
        updateDynamicManifestAndFavicon(cached);
      }

      setLoading(false);
      loadRankings();
    };
    loadSavedSession();
  }, []);

  // 1.2 Setup continuous live Firestore synchronizer for the active profile
  useEffect(() => {
    if (!profile?.id) return;

    // Fast bind to live Firestore updates of likes, level, and referrals
    const unsubListener = listenToProfile(profile.id, (firestoreProfile) => {
      if (firestoreProfile) {
        setProfile(firestoreProfile);
        saveProfileLocal(firestoreProfile);
        updateDynamicManifestAndFavicon(firestoreProfile);
        setRegError('');
      }
    });

    return () => unsubListener();
  }, [profile?.id]);

  // 1.3 Detect user level-up promotion to show celebration modal
  useEffect(() => {
    if (!profile) return;
    
    const likes = Number(profile.likes || 0);
    const referrals = Number(profile.referralCount || 0);
    const views = Number(profile.views || 0);
    const currentLevel = Number(profile.level || 1);
    const totalPoints = (likes * 2) + referrals + views;

    let calLevel = 1;
    if (totalPoints >= 50 || currentLevel === 3) {
      calLevel = 3;
    } else if (totalPoints >= 15 || currentLevel === 2) {
      calLevel = 2;
    }

    const storedLvl = localStorage.getItem('esm_last_seen_level');
    if (storedLvl) {
      const lastSeen = parseInt(storedLvl, 10);
      if (calLevel > lastSeen) {
        setCelebrationNewLevel(calLevel);
        setCelebrationOpen(true);
      }
    }
    
    localStorage.setItem('esm_last_seen_level', calLevel.toString());
  }, [profile]);

  // Compute standings
  const loadRankings = async () => {
    const board = await getLeaderboard();
    setLeaderboard(board);
  };

  useEffect(() => {
    if (profile && leaderboard.length > 0) {
      const idx = leaderboard.findIndex(u => u.username.toLowerCase() === profile.username.toLowerCase());
      if (idx !== -1) {
        setRank(idx + 1);
      } else {
        setRank(leaderboard.length + 1);
      }
    }
  }, [profile, leaderboard]);

  // ImgBB Upload
  const uploadToImgBB = async (file: File): Promise<string> => {
    const API_KEY = 'dc27fab1fc79e9e04ab24f192bc3146e';
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل رفع الصورة الفاخرة إلى خوادم الرداء');
    }

    const json = await response.json();
    return json.data.url;
  };

  // 2. Code entry authentication submission
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = enteredCode.trim().toUpperCase();
    if (!cleanCode) return;

    setVerifyingCode(true);
    setVerificationError('');

    try {
      // 1. Fetch doc from accessCodes collection using the custom helper
      const codeData = await getAccessCode(cleanCode);

      if (!codeData) {
        setVerificationError('عذراً، هذا الكود غير صحيح أو انتهت فترة إتاحته. يرجى التأكد من الكود المطبوع على بطاقة الشراء للقطعة المذهبة الخاصة بك.');
        setVerifyingCode(false);
        return;
      }

      // Credentials rule
      const email = `${cleanCode.toLowerCase()}@esmydahab.com`;
      const password = `Pass-${cleanCode}`;

      if (codeData.used === true) {
        // Log in
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          console.warn("Auth sign-in failed, attempting direct profile resolution:", authErr);
        }

        const uid = auth.currentUser?.uid || codeData.activatedBy;
        let p: UserProfile | null = null;
        if (uid) {
          p = await getProfileByUID(uid);
        }
        if (!p) {
          p = await getProfileByAccessCode(cleanCode);
        }

        if (p) {
          localStorage.setItem('esm_code', cleanCode);
          localStorage.setItem('esm_active_access_code', cleanCode);
          if (p.arabicName && p.englishName) {
            localStorage.setItem('app_identity', `${p.arabicName} ● ${p.englishName.toUpperCase()}`);
          } else {
            localStorage.setItem('app_identity', p.displayName);
          }
          localStorage.setItem('esm_my_profile', JSON.stringify(p));

          setProfile(p);
          saveProfileLocal(p);
          updateDynamicManifestAndFavicon(p);

          setSuccessMsg(`أهلاً بك في جناحك الشخصي الفاخر، ${p.displayName} ✨`);
          setTimeout(() => setSuccessMsg(''), 4000);
          loadRankings();
        } else {
          // If profile not found, maybe they registered but document is corrupted or missing
          setTempAccessCode(cleanCode);
          setTempProduct(codeData.product || 'premium');
          setVerificationPassed(true);
        }

      } else {
        // Pristine code document exists but has no username -> proceed to onboarding registration
        setTempAccessCode(cleanCode);
        setTempProduct(codeData.product || 'premium');
        setVerificationPassed(true);
      }
    } catch (err: any) {
      console.error("Code gate verification fail", err);
      setVerificationError('عذراً، فشل التحقق الفني بسبب تداخل الاتصال بقاعدة البيانات. يرجى إعادة المحاولة.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // 3. Complete brand new registration onboarding
  const handleRegisterOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegError('');

    const cleanUsername = regUsername.trim().toLowerCase();
    if (cleanUsername.length < 2 || cleanUsername.length > 32) {
      setRegError('يجب أن يتراوح اسم المستخدم الفاخر بين 2 و 32 حرفاً');
      setRegistering(false);
      return;
    }

    const alphanumeric = /^[a-z0-9_\-]+$/;
    if (!alphanumeric.test(cleanUsername)) {
      setRegError('يجب أن يتكون الاسم الرمزى للحساب (المعرف) من حروف إنجليزية صغيرة، أرقام، أو شرطات فقط لسلامة الروابط التفاعلية');
      setRegistering(false);
      return;
    }

    if (!regArabicName.trim()) {
      setRegError('برجاء كتابة الاسم باللغة العربية.');
      setRegistering(false);
      return;
    }

    if (!regEnglishName.trim()) {
      setRegError('برجاء كتابة الاسم باللغة الإنجليزية.');
      setRegistering(false);
      return;
    }

    try {
      // Assert username uniqueness
      const usernameOccupied = await getProfileByUsername(cleanUsername);
      if (usernameOccupied) {
        setRegError('اسم المستخدم الملكي محجوز بالفعل لعضو آخر. يرجى اختيار اسم مستخدم متميز.');
        setRegistering(false);
        return;
      }

      // Upload profile image if chosen
      let finalPhotoUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23050505'/><text x='15' y='65' fill='%23D4AF37' font-family='serif' font-size='50' font-weight='bold'>ذهـب</text></svg>";
      if (profilePicFile) {
        setUploadingImage(true);
        try {
          finalPhotoUrl = await uploadToImgBB(profilePicFile);
        } catch (uploadErr) {
          console.error("ImgBB upload failed", uploadErr);
          setRegError('فشل رفع صورتك الشخصية الملكية للفضاء السحابي. يرجى محاولة ملف صورة أصغر.');
          setRegistering(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Auth credentials
      const email = `${tempAccessCode.toLowerCase()}@esmydahab.com`;
      const password = `Pass-${tempAccessCode}`;

      let uid = '';
      try {
        const authResult = await createUserWithEmailAndPassword(auth, email, password);
        uid = authResult.user.uid;
      } catch (authErr: any) {
        console.warn("Could not create user account on Firebase Auth, falling back:", authErr);
        // Fallback or handle if account already exists
        if (authErr.code === 'auth/email-already-in-reply' || authErr.code === 'auth/email-already-in-use') {
          try {
            const loginResult = await signInWithEmailAndPassword(auth, email, password);
            uid = loginResult.user.uid;
          } catch (loginErr) {
            uid = `fallback-${tempAccessCode}`;
          }
        } else {
          uid = `fallback-${tempAccessCode}`;
        }
      }

      // Map level
      let activeLevel = RoyalLevel.GOLD;
      if (tempProduct === 'classic') {
        activeLevel = RoyalLevel.BRONZE;
      } else if (tempProduct === 'duo') {
        activeLevel = RoyalLevel.SILVER;
      }

      const combinedDisplayName = `${regArabicName.trim()} ● ${regEnglishName.trim().toUpperCase()}`;

      // Build User Profile data
      const newUserProfile: UserProfile = {
        code: tempAccessCode,
        username: cleanUsername,
        arabicName: regArabicName.trim(),
        englishName: regEnglishName.trim(),
        displayName: combinedDisplayName,
        appName: regAppName.trim(),
        photoUrl: finalPhotoUrl,
        bio: regBio.trim() || 'الفخامة ليست خياراً، بل هي هوية مذهبة من صياغة إسمي ذهب.',
        level: activeLevel,
        likes: 0,
        referralCount: 0,
        accessCode: tempAccessCode,
        phone: regPhone.trim(),
        createdAt: new Date().toISOString(),
      };

      // Write user doc using the Auth UID as Document ID!
      await setDoc(doc(db, 'users', uid), newUserProfile);

      // Claim accessCode doc
      await claimAccessCode(tempAccessCode, cleanUsername, uid);

      localStorage.setItem('esm_code', tempAccessCode);
      localStorage.setItem('esm_active_access_code', tempAccessCode);
      localStorage.setItem('app_identity', regAppName.trim());
      localStorage.setItem('esm_my_profile', JSON.stringify(newUserProfile));

      setProfile(newUserProfile);
      saveProfileLocal(newUserProfile);
      updateDynamicManifestAndFavicon(newUserProfile);
      setSuccessMsg('تم تفعيل بطاقتك الشخصية وتثبيت التطبيق الملكي بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadRankings();

    } catch (err: any) {
      console.error("Onboarding failed", err);
      setRegError('حدث تداخل برمجي في حفظ بطاقة كبار الشخصيات. يرجى إعادة مراجعة البيانات.');
    } finally {
      setRegistering(false);
    }
  };

  // Collapsible inline edits profile details
  const handleOpenEdit = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName);
    setEditArabicName(profile.arabicName || '');
    setEditEnglishName(profile.englishName || '');
    setEditPhone(profile.phone || '');
    setEditAppName(profile.appName || profile.arabicName || 'إسمي ذهب');
    setEditBio(profile.bio);
    setEditPhotoUrl(profile.photoUrl);
    setEditLikes(profile.likes || 0);
    setEditReferralCount(profile.referralCount || 0);
    setEditLevel(profile.level || 1);
    setEditPicFile(null);
    setIsEditing(true);
  };

  // Submit profile edits
  const handleSaveProfileEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setRegistering(true);
    setEditError('');

    try {
      let finalPhotoUrl = editPhotoUrl;
      if (editPicFile) {
        setUploadingImage(true);
        try {
          finalPhotoUrl = await uploadToImgBB(editPicFile);
        } catch (uploadErr) {
          setEditError('فشل رفع صورتك الشخصية الجديدة إلى السيرفر.');
          setRegistering(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const updateData = {
        arabicName: editArabicName.trim(),
        englishName: editEnglishName.trim(),
        appName: editAppName.trim(),
        phone: editPhone.trim(),
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        photoUrl: finalPhotoUrl,
      };

      await updateDoc(doc(db, 'users', profile.id), updateData);
      
      // Update local storage app_identity
      localStorage.setItem('app_identity', editAppName.trim());
      
      setProfile(prev => {
        if (!prev) return null;
        const next = { ...prev, ...updateData };
        saveProfileLocal(next);
        updateDynamicManifestAndFavicon(next);
        return next;
      });

      setIsEditing(false);
      setSuccessMsg('تم صقل وتحديث بياناتك الشخصية الحصرية بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadRankings();

    } catch (err) {
      setEditError('عذراً، حدث خطأ أثناء الاتصال بقاعدة البيانات لتحديث الملف.');
    } finally {
      setRegistering(false);
    }
  };

  // Complete clean logout (leaves cached layout clear to allow other log-ins)
  const handleLogout = async () => {
    setLoading(true);
    try {
      setProfile(null);
      saveProfileLocal(null);
      updateDynamicManifestAndFavicon(null);
      localStorage.removeItem('esm_code');
      localStorage.removeItem('esm_active_access_code');
      setVerificationPassed(false);
      setTempAccessCode('');
      setEnteredCode('');
    } catch (err) {
      console.error("Signout error", err);
    } finally {
      setLoading(false);
    }
  };

  // Level Stage details solver
  const getLevelDetails = (likes: number, referrals: number, currentLevel: number, views: number = 0) => {
    const totalPoints = (likes * 2) + referrals + views;
    
    // Evaluate display properties
    let title = 'برونزي';
    let label = 'المستوى الأول البرونزي (Bronze Level)';
    let badgeColor = 'border-[#CD7F32] text-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.3)]';
    let assetUrl = levelAssets.stage1IconUrl || '/stage1.png';
    let pointsNeeded = 15;
    let nextTier = '🥈 الفضية الراقية';
    
    if (totalPoints >= 50 || currentLevel === 3) {
      title = 'الملكي التاج الذهبي';
      label = 'المستوى الثالث الملكي التاج الذهبي (Royal Gold)';
      badgeColor = 'border-[#D4AF37] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.45)]';
      assetUrl = levelAssets.stage3IconUrl || '/stage3.png';
      pointsNeeded = 50;
      nextTier = '';
    } else if (totalPoints >= 15 || currentLevel === 2) {
      title = 'الفضي الفخم';
      label = 'المستوى الثاني الفضي (Silver Level)';
      badgeColor = 'border-[#C0C0C0] text-[#C0C0C0] shadow-[0_0_15px_rgba(192,192,192,0.3)]';
      assetUrl = levelAssets.stage2IconUrl || '/stage2.png';
      pointsNeeded = 50;
      nextTier = '👑 التاج الذهبي الملكي';
    }

    const progress = Math.min((totalPoints / pointsNeeded) * 100, 100);
    const remaining = Math.max(pointsNeeded - totalPoints, 0);

    return {
      title,
      label,
      badgeColor,
      assetUrl,
      progress,
      remaining,
      nextTier,
      totalPoints
    };
  };

  const handleCopyLink = () => {
    if (!profile) return;
    const shareUrl = `https://esmy-dahab.pages.dev/${profile.username}?ref=${profile.username}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((err) => console.error("Clipboard copy failed", err));
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 relative text-white">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
        <p className="text-xs font-mono text-neutral-400 mt-2 tracking-widest select-none uppercase">VERIFYING ROYAL CREDENTIALS...</p>
      </div>
    );
  }

  // 1. Code-Entry Login View (If not logged in and not verifying code)
  if (!profile && !verificationPassed) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 relative text-white w-full">
        <div className="w-full max-w-sm rounded-[32px] overflow-hidden bg-[#0A0A0B]/95 border border-[#D4AF37]/30 p-7 backdrop-blur-3xl text-center shadow-[0_24px_64px_rgba(212,175,55,0.12)] relative">
          <div className="absolute inset-x-0 -top-12 h-24 bg-[#D4AF37]/10 rounded-full filter blur-xl pointer-events-none" />
          
          <div className="flex flex-col items-center mb-6 mt-2 relative z-10">
            <span className="text-[10px] tracking-[0.25em] font-serif uppercase text-[#D4AF37] font-bold">VIP CODES PORTAL</span>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#D4AF37]/80 to-[#BF953F]/40 p-[1px] shadow-lg mt-3 flex items-center justify-center animate-pulse">
              <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                <Crown className="w-5.5 h-5.5 text-[#D4AF37]" />
              </div>
            </div>
            <h2 className="text-2xl font-serif text-gold font-bold mt-4 tracking-wide leading-tight">
              لوحة الفخامة الملكية • VIP
            </h2>
            <div className="h-[1px] w-12 bg-[#D4AF37]/35 mt-3" />
            <p className="text-xs text-neutral-300 leading-relaxed mt-4 px-1.5 font-sans">
              البوابة الحصرية لتفعيل وإدارة تطبيق قطعتك الذهبية التفاعلية من ماركة <span className="text-[#D4AF37] font-semibold">إسمي ذهب</span>. أدخل كود القطعة الحصري للمتابعة.
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4 text-right relative z-10">
            <div>
              <label htmlFor="jewelCodeInput" className="block text-[11px] font-serif text-[#D4AF37] mb-2 mr-1 font-bold">كود القطعة الذهبية (Jewelry Code Entry)</label>
              <input 
                id="jewelCodeInput"
                type="text" 
                placeholder="مثال: ESM-XXXXXX"
                required
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-black border border-[#D4AF37]/25 text-white font-mono text-center text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 min-h-[44px] transition-all tracking-wider placeholder-neutral-600 uppercase"
              />
            </div>

            {verificationError && (
              <p className="text-red-400 text-[11px] leading-relaxed p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-center font-sans">
                {verificationError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifyingCode}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gold-gradient text-black font-serif font-black text-sm shadow-md hover:brightness-110 active:scale-98 transition-all min-h-[44px]"
            >
              {verifyingCode ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
                  <span>جاري التحقق الفني الفاخر...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4.5 h-4.5" />
                  <span>تحقق ودخول بأمان</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-[#D4AF37]/10 flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-500 tracking-wide select-none">
            <Zap className="w-3.5 h-3.5 text-[#D4AF37]/60" />
            <span>EXCLUSIVITY ASSURED • ESMY DAHAB PWA</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Onboarding Registration Form (Wait state: Code checked & unique, need inputs)
  if (!profile && verificationPassed) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center py-8 px-4 text-white w-full">
        <div className="w-full max-w-sm rounded-[32px] bg-[#0A0A0B]/95 border border-[#D4AF37]/45 p-6 backdrop-blur-3xl shadow-[0_24px_64px_rgba(212,175,55,0.15)] relative">
          
          <div className="text-center mb-6">
            <span className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#D4AF37] font-bold">الملف الفاخر للأعضاء</span>
            <h3 className="text-xl font-serif text-gold font-black mt-1">تأسيس الهوية الذهبية 👑</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              تم التحقق من فخامة القطعة بنجاح! كودك النشط هو: <span className="text-[#D4AF37] font-mono font-bold select-all">{tempAccessCode}</span>. يرجى ملء بيانات بروفايلك لأول مرة لتوليد ملف تثبيت الهاتف باسمك المخصص.
            </p>
          </div>

          <form onSubmit={handleRegisterOnboard} className="flex flex-col gap-4 text-right">
            <div>
              <label htmlFor="regArabicNameInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">الاسم الشخصي الفاخر (بالعربية) ✨</label>
              <input 
                id="regArabicNameInput"
                type="text" 
                placeholder="مثال: أحمد" 
                required
                value={regArabicName}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegArabicName(val);
                  if (regAppName === 'إسمي ذهب' || regAppName === '') {
                    setRegAppName(val ? `إسمي ذهب - ${val}` : 'إسمي ذهب');
                  }
                }}
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="regEnglishNameInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">Your Nobles Name (In English) 👑</label>
              <input 
                id="regEnglishNameInput"
                type="text" 
                placeholder="e.g. AHMED" 
                required
                value={regEnglishName}
                onChange={(e) => setRegEnglishName(e.target.value)}
                className="w-full text-left font-sans text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="regAppNameInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">اسم التطبيق المخصص عند التثبيت (App Name) 📳</label>
              <input 
                id="regAppNameInput"
                type="text" 
                placeholder="مثال: إسمي ذهب - أحمد" 
                required
                value={regAppName}
                onChange={(e) => setRegAppName(e.target.value)}
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block leading-tight mr-1">
                اسم الأيقونة والواجهة الفاخرة عند تحميل التطبيق وتثبيته على جهازك.
              </span>
            </div>

            <div>
              <label htmlFor="regUsernameInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">اسم المعرف الحصري (أحرف إنجليزية وأرقام فقط)</label>
              <input 
                id="regUsernameInput"
                type="text" 
                placeholder="مثال: ahmed_gold" 
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                className="w-full text-left font-mono text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block leading-tight mr-1 font-mono">
                رابط بروفايلك الفاخر: esmy-dahab.pages.dev/{regUsername || 'username'}
              </span>
            </div>

            <div>
              <label htmlFor="regPhoneInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">رقم الجوال الخاص بك (مع مفتاح الدولة)</label>
              <input 
                id="regPhoneInput"
                type="tel" 
                placeholder="مثال: 96655xxxxxxx" 
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full text-left font-mono text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="regBioInput" className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">النبذة الملكية الحصرية (Bio)</label>
              <textarea 
                id="regBioInput"
                placeholder="رؤيتك الفذة في عالم الأناقة، أو شعار يناسب فخامتك..."
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px] h-16 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-serif text-[#D4AF37] mb-1.5 mr-0.5 font-bold">صورتك الشخصية الفاخرة</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-900 duration-150 text-xs border border-[#D4AF37]/25 px-4 py-3 rounded-xl min-h-[44px] transition-all transition-colors font-sans">
                  <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                  <span>{profilePicFile ? 'تم اختيار صورتك بنجاح' : 'اختر صورة من البومك'}</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)}
                    className="hidden" 
                  />
                </label>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 leading-normal font-sans">يتم رفع صورتك وتشفيرها سحابياً لتعمل كأيقونة حية لملف تثبيت التطبيق.</p>
            </div>

            {regError && (
              <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-xs text-red-400 text-center font-sans leading-relaxed">
                {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={registering || uploadingImage}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gold-gradient text-black font-serif font-black text-xs shadow-xl active:scale-95 duration-100 transition-transform mt-2 min-h-[44px]"
            >
              {(registering || uploadingImage) ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
                  <span>جاري تفعيل ملف النبالة الحصري...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>تفعيل بطاقتي وتثبيت التطبيق الملكي ✨</span>
                </>
              )}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full text-center text-xs text-neutral-400 underline hover:text-white mt-4 py-2 min-h-[44px]"
          >
            إلغاء وتغيير الكود المدخل
          </button>
        </div>
      </div>
    );
  }

  // 3. User is Logged In -> Render Premium Dashboard
  const activeProfile = profile!;
  const lvl = getLevelDetails(activeProfile.likes, activeProfile.referralCount, activeProfile.level, activeProfile.views || 0);
  const isOwner = true;

  return (
    <div className="text-white w-full max-w-xl mx-auto px-4 py-6 text-right animate-fade-in relative z-10 font-sans">
      
      {/* Toast Alert message */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-black/95 border border-[#D4AF37] text-[#D4AF37] rounded-2xl text-xs font-serif shadow-[0_12px_32px_rgba(212,175,55,0.25)] animate-bounce text-center max-w-xs">
          {successMsg}
        </div>
      )}

      {/* Profile Header Block */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-black/85 rounded-3xl border border-[#D4AF37]/20 backdrop-blur-3xl mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-[#D4AF37]/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 text-right">
          <div className="relative w-16 h-16 shrink-0 z-10">
            {/* Elegant static tilted level metallic crown top-left of dashboard avatar */}
            <div className="absolute -top-3 -left-2.5 -rotate-[22deg] z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              <Crown className={`w-5 h-5 ${
                activeProfile.level === 3 ? 'text-[#D4AF37]' :
                activeProfile.level === 2 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'
              } fill-current/10`} />
            </div>
            
            <div className={`w-full h-full rounded-full p-[2px] bg-gradient-to-tr ${
              activeProfile.level === 3 ? 'from-[#BF953F] via-[#FCF6BA] to-[#AA771C]' : 
              activeProfile.level === 2 ? 'from-[#888888] via-[#F0F0F0] to-[#555555]' : 
              'from-[#8C3F10] via-[#F5D6C6] to-[#592606]'
            }`}>
              <div className="w-full h-full rounded-full bg-[#111] overflow-hidden">
                <img 
                  src={activeProfile.photoUrl} 
                  alt={activeProfile.displayName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23050505'/><text x='15' y='65' fill='%23D4AF37' font-family='serif' font-size='50' font-weight='bold'>ذهـب</text></svg>";
                  }}
                />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-serif tracking-wide">{activeProfile.displayName}</h1>
            <p className="text-xs text-[#D4AF37] font-mono mt-1 select-all font-medium direction-ltr text-right">@{activeProfile.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={() => window.open(`https://esmy-dahab.pages.dev/${activeProfile.username}`, '_blank')}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-[#D4AF37]/30 text-[#D4AF37] font-serif font-bold text-xs transition-colors hover:bg-neutral-850 flex items-center gap-1.5 min-h-[44px]"
          >
            <span>معاينة بطاقتي VIP</span>
            <ChevronLeft className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={handleLogout}
            title="تسجيل الخروج الملكي"
            className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-900 flex items-center justify-center text-red-500 hover:bg-red-950/20 active:scale-95 transition-all min-h-[44px]"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Profile Editing Panel */}
      {isEditing ? (
        <div className="p-5 bg-[#0C0C0E] rounded-3xl border border-[#D4AF37]/45 mb-6 backdrop-blur-3xl shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-900">
            <h3 className="text-xs font-serif font-black text-gold">تعديل تفاصيل الملف الملكي الحصري</h3>
            <button 
              onClick={() => setIsEditing(false)} 
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900"
            >
              إلغاء التعديل
            </button>
          </div>

          <form onSubmit={handleSaveProfileEdits} className="flex flex-col gap-4 text-right">
            <div>
              <label htmlFor="editArabicNameInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold">الاسم الشخصي (بالعربية)</label>
              <input 
                id="editArabicNameInput"
                type="text" 
                value={editArabicName}
                onChange={(e) => setEditArabicName(e.target.value)}
                required
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="editEnglishNameInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold font-sans">Nobles Name (In English)</label>
              <input 
                id="editEnglishNameInput"
                type="text" 
                value={editEnglishName}
                onChange={(e) => setEditEnglishName(e.target.value)}
                required
                className="w-full text-left font-sans text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="editDisplayNameInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold">اسم العرض بالتطبيق (Display Name)</label>
              <input 
                id="editDisplayNameInput"
                type="text" 
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                required
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="editAppNameInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold">اسم التطبيق للـ PWA (App Name عند التثبيت)</label>
              <input 
                id="editAppNameInput"
                type="text" 
                value={editAppName}
                onChange={(e) => setEditAppName(e.target.value)}
                required
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="editPhoneInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold">رقم الجوال الفاخر (مع مفتاح الدولة)</label>
              <input 
                id="editPhoneInput"
                type="tel" 
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full text-left font-mono text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="editBioInput" className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-bold">النبذة الشخصية (Bio)</label>
              <textarea 
                id="editBioInput"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full text-right text-xs px-4 py-3 rounded-xl bg-black border border-neutral-900 text-white focus:border-[#D4AF37] focus:outline-none min-h-[44px] h-16 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-serif text-[#D4AF37] mb-1 mr-0.5 font-semibold">تغيير الصورة الشخصية</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-900 text-xs border border-[#D4AF37]/20 px-4 py-3 rounded-xl transition-all min-h-[44px]">
                  <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                  <span>{editPicFile ? 'تم اختيار صورة جديدة' : 'اختر صورة من البومك لرفعها'}</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setEditPicFile(e.target.files?.[0] || null)}
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-400 text-center font-sans">{editError}</p>
            )}

            <button
              type="submit"
              disabled={registering || uploadingImage}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold-gradient text-black font-serif font-black text-xs hover:opacity-95 shadow-lg min-h-[44px] transition-all"
            >
              {(registering || uploadingImage) ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
                  <span>جاري تشفير وحفظ البيانات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>حفظ التفاصيل الفاخرة</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : isOwner ? (
        <div className="mb-6 flex justify-start">
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-serif text-neutral-400 hover:text-white transition-colors duration-150 min-h-[44px] pointer-events-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>تعديل تفاصيل بطاقتي الملكية</span>
          </button>
        </div>
      ) : null}

      {/* Dynamic Stages Concept Panel */}
      <div className="p-5 rounded-3xl bg-black/85 border border-neutral-900 shadow-xl mb-6 text-right relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900/60 mb-4 select-none">
          <Layers className="w-4 h-4 text-[#D4AF37]/75" />
          <h3 className="text-xs font-serif font-black text-gold uppercase tracking-wider">لوحة مستويات القطعة الحية</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Level image with dynamic animation glow */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* Ambient golden circular pulse glow */}
            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 filter blur-md animate-pulse scale-105" />
            <div className="w-20 h-20 rounded-2xl bg-neutral-950 border border-[#D4AF37]/30 flex items-center justify-center overflow-hidden shadow-inner p-1">
              {lvl.assetUrl ? (
                <img 
                  src={lvl.assetUrl} 
                  alt={lvl.title} 
                  className="w-full h-full object-contain animate-fade-in" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                // Beautiful fallback premium graphics
                <div className="flex flex-col items-center justify-center text-center">
                  <Award className="w-8 h-8 text-[#D4AF37] animate-pulse" />
                  <span className="text-[9px] text-[#D4AF37]/75 font-serif font-black tracking-wide mt-1 uppercase">LEVEL {activeProfile.level}</span>
                </div>
              )}
            </div>
            
            {/* Active label index mini tag */}
            <span className="absolute -bottom-2 right-1/2 translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#111] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-[9px] font-bold">
              STAGE {activeProfile.level}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-right">
            <h4 className="text-sm font-serif font-black text-white">{lvl.label}</h4>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              يتم ترقية رتبة قطعتك الذهبية بشكل تفاعلي بناء على مجموع نقاط الدعم الخاص بك من المعجبين والموصين والزيارات الحقيقية بالمنصة.
            </p>
            
            <div className="mt-4 bg-neutral-950 rounded-full h-2 w-full overflow-hidden border border-neutral-900 relative">
              <div 
                className="bg-gold-gradient h-full transition-all duration-1000 ease-out shadow-inner" 
                style={{ width: `${lvl.progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] mt-2 select-none">
              <span className="text-neutral-500 font-serif">
                {lvl.nextTier ? `متبقي ${lvl.remaining} نقطة للإنتقال لـ ${lvl.nextTier}` : 'لقد حققت قمة التاج الذهبي الملكي الخالص 👑'}
              </span>
              <span className="text-[#D4AF37] font-mono font-bold">نواة النقاط: {lvl.totalPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid of Independent Referrals */}
      <h3 className="text-xs font-serif tracking-widest text-[#D4AF37]/50 uppercase mb-3 mr-1 select-none font-bold">الإحصائيات الشخصية المستقلة • Stats</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        
        <div className="bg-black/85 rounded-2xl p-4 border border-neutral-900 shadow-lg flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between text-neutral-500 select-none">
            <span className="text-[10px] font-serif font-bold uppercase">الموصين والزيارات</span>
            <Share2 className="w-4.5 h-4.5 text-[#CD7F32]" />
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-mono font-bold text-gold">{activeProfile.referralCount}</h4>
            <p className="text-[10px] text-neutral-400 font-serif mt-1">حركة إحالات حية ومحسوبة</p>
          </div>
        </div>

        <div className="bg-black/85 rounded-2xl p-4 border border-neutral-900 shadow-lg flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between text-neutral-500 select-none">
            <span className="text-[10px] font-serif font-bold uppercase">المركز الشرفي</span>
            <Trophy className="w-4.5 h-4.5 text-yellow-500" />
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-mono font-semibold text-white">#{rank || '..'}</h4>
            <p className="text-[10px] text-neutral-400 font-serif mt-1">بين جميع نبلاء ونخبة المنصة</p>
          </div>
        </div>

        <div className="bg-black/85 rounded-2xl p-4 border border-neutral-900 shadow-lg flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between text-neutral-500 select-none">
            <span className="text-[10px] font-serif font-bold uppercase">نقاط الإعجاب</span>
            <Sparkles className="w-4.5 h-4.5 text-[#C0C0C0]" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-mono font-bold text-white flex items-center justify-end gap-1">
              <span>{activeProfile.likes}</span>
              <span className="text-amber-500">♥</span>
            </h4>
            <p className="text-[10px] text-neutral-400 font-serif mt-1">قلوب حقيقية حصدها بروفايلك</p>
          </div>
        </div>

      </div>

      {/* Share Section with Arabian Promotion Template */}
      <div className="bg-black/90 rounded-[24px] border border-[#D4AF37]/25 p-5 backdrop-blur-3xl mb-8 shadow-xl text-right">
        <h4 className="text-sm font-serif font-black text-white">الملف التعريفي الملكي لمالكي القطع الذهبية</h4>
        <p className="text-xs text-neutral-400 mt-1 leading-normal">
          شارك بطاقتك مع أصدقائك عبر الرابط الحصري المطبوع على قطعتك، لتمنح العمال الموصين فرصة زيارة المتجر المذهب وكسب النقاط في حسابك تلقائياً لدعم رتبتك.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
          <div className="flex-1 bg-neutral-950 font-mono text-center text-xs text-[#D4AF37] px-4 py-3 rounded-xl border border-neutral-900 select-all overflow-x-auto whitespace-nowrap min-h-[44px] flex items-center justify-center direction-ltr">
            esmy-dahab.pages.dev/{activeProfile.username}?ref={activeProfile.username}
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-gold-gradient text-black font-serif font-black text-xs hover:brightness-110 active:scale-97 duration-100 transition-all shrink-0 min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span>تم نسخ الرابط الفخم بنجاح 🔗</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-black" />
                <span>نسخ رابط المشاركة الفاخر 🔗</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hall of Nobles Leaderboard Panel */}
      <div className="bg-black/80 rounded-3xl border border-neutral-900 p-5 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-neutral-900/40 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-4 select-none">
          <span className="text-[9px] font-mono text-neutral-500 font-bold">HALL OF EXCELLENCE</span>
          <h3 className="text-sm font-serif font-black text-gold">مجلس النبلاء والمتصدرين 🏆</h3>
        </div>

        <div className="flex flex-col gap-3 relative z-10">
          {leaderboard.slice(0, 5).map((user, idx) => (
            <div 
              key={user.username} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                user.username.toLowerCase() === activeProfile.username.toLowerCase() 
                  ? 'bg-gradient-to-r from-yellow-950/20 to-black border-[#D4AF37]/50 shadow-md scale-101' 
                  : 'bg-[#0A0A0C] border-neutral-900/60 hover:bg-neutral-950'
              }`}
            >
              {/* Point breakdowns */}
              <div className="flex items-center gap-3 font-mono text-xs text-neutral-400 select-none">
                <div>
                  <span className="text-white font-bold">{user.likes}</span> <span className="text-[10px] text-neutral-500">إعجاب</span>
                </div>
                <div className="w-px h-3 bg-neutral-800" />
                <div>
                  <span className="text-white font-bold">{user.referralCount}</span> <span className="text-[10px] text-neutral-500">موصٍ</span>
                </div>
              </div>

              {/* Identity details */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <h4 className="text-xs font-bold text-white font-serif">{user.displayName}</h4>
                  <p className="text-[10px] text-neutral-500 font-mono">@{user.username}</p>
                </div>

                <div className="relative w-8 h-8 shrink-0">
                  <div className={`w-full h-full rounded-full p-[1.5px] ${
                    user.level === RoyalLevel.GOLD ? 'bg-gold-gradient' : 
                    user.level === RoyalLevel.SILVER ? 'bg-silver-gradient' : 'bg-bronze-gradient'
                  }`}>
                    <div className="w-full h-full rounded-full bg-[#111] overflow-hidden">
                      <img 
                        src={user.photoUrl} 
                        alt={user.displayName} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23050505'/><text x='15' y='65' fill='%23D4AF37' font-family='serif' font-size='50' font-weight='bold'>ذهـب</text></svg>";
                        }}
                      />
                    </div>
                  </div>
                  {user.level === RoyalLevel.GOLD && (
                    <Crown className="w-3 h-3 text-[#D4AF37] absolute -top-1.5 -right-1.5" />
                  )}
                </div>

                <span className="w-4 text-center font-mono text-xs text-[#D4AF37] font-black select-none">
                  {idx + 1}
                </span>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center text-xs text-neutral-600 font-serif py-4 select-none">لا توجد لوحة شرف مسجلة حالياً.</p>
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      {celebrationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="celebrationModal">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#D4AF37] bg-[#0E0E12] p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)] text-center text-white">
            {/* Background elements */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full border border-[#D4AF37]/10" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full border border-[#D4AF37]/10" />

            {/* Stage Icon */}
            <div className="flex justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 filter blur-lg scale-110" />
              <img 
                src={celebrationNewLevel === 3 ? (levelAssets.stage3IconUrl || '/stage3.png') : celebrationNewLevel === 2 ? (levelAssets.stage2IconUrl || '/stage2.png') : (levelAssets.stage1IconUrl || '/stage1.png')} 
                alt="New Level Badge" 
                className="w-24 h-24 object-contain animate-bounce"
                referrerPolicy="no-referrer"
              />
            </div>

            <span className="inline-block text-[10px] tracking-widest font-mono text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1 rounded-full mb-3 border border-[#D4AF37]/25">
              ترقية ملكية جديدة • Promotion Royal VIP
            </span>

            <h3 className="text-xl font-serif font-bold text-white mb-2 leading-snug">
              ✨ مبارك ترقيتك للمستوى {celebrationNewLevel === 3 ? 'الملكي الذهبي' : 'الفضي الفخم'}!
            </h3>

            <p className="text-xs text-neutral-300 font-serif leading-relaxed mb-6">
              لقد قمنا بتحديث الواجهة والأيقونة الفاخرة الخاصة بالتطبيق تلقائياً لتتطابق مع رتبتك الملكية الجديدة (<b>{celebrationNewLevel === 3 ? 'التاج الذهبي الملكي' : 'المستوى الفضي الرفيع'}</b>).
            </p>

            <div className="bg-neutral-950/80 rounded-2xl border border-neutral-900 p-4 mb-6 leading-relaxed text-right">
              <p className="text-[11px] text-[#D4AF37] font-semibold mb-1">💡 ملحوظة تثبيت التطبيق الإضافية:</p>
              <p className="text-[10px] text-neutral-400">
                إذا لم تظهر الأيقونة الجديدة فوراً على شاشة جهازك، نتشرف بأن تقوم بإلغاء تثبيت التطبيق الحالي ثم إعادة تثبيته مجدداً، لتظهر الهوية الجديدة بوضوح وبشكل كامل.
              </p>
            </div>

            <button
              onClick={() => setCelebrationOpen(false)}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#b08e28] active:scale-95 transition-all py-3 rounded-xl font-bold font-serif text-xs shadow-[0_4px_20px_rgba(212,175,55,0.3)] min-h-[44px]"
            >
              تشرفت بالترقية الرفيعة ✨
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
