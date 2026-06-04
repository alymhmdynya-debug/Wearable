import { useState, useEffect } from 'react';
import { Download, Sparkles } from 'lucide-react';

export default function PWAInstallBar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBar, setShowInstallBar] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify user they can install PWA
      setShowInstallBar(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBar(false);
      console.log('ESMY DAHAB successfully installed on user desktop/mobile.');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to installation: ${outcome}`);
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowInstallBar(false);
  };

  if (!showInstallBar || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
      <div 
        className="bg-black/90 backdrop-blur-md border border-[#D4AF37]/50 rounded-2xl p-4 shadow-[0_8px_32px_rgba(212,175,55,0.25)] flex items-center justify-between gap-3 animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div className="text-right flex-1">
            <p className="text-xs text-gray-400 font-sans font-medium">تطبيق PWA حصري</p>
            <h4 className="text-sm font-bold text-white font-serif tracking-wide mt-0.5">
              تثبيت تطبيقك الشخصي الفاخر بضغطة واحدة
            </h4>
          </div>
        </div>
        
        <button
          onClick={handleInstallClick}
          className="px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-semibold text-xs hover:scale-105 active:scale-95 transition-transform duration-100 flex items-center gap-1.5 shrink-0 shadow-lg min-h-[44px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تثبيت</span>
        </button>
      </div>
    </div>
  );
}
