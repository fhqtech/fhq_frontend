import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Zap, Heart, Brain, Loader2, Copy, Check } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface SwipeQRSectionProps {
  interviewId: string;
}

export function SwipeQRSection({ interviewId }: SwipeQRSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrKey, setQrKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [otp, setOtp] = useState<string>('');

  // Fetch OTP from backend
  useEffect(() => {
    const fetchOtp = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/swipe/session/${interviewId}`
        );

        if (response.ok) {
          const data = await response.json();
          setOtp(data.otp);
        }
      } catch (error) {
        console.error('Error fetching OTP:', error);
      }
    };

    fetchOtp();
  }, [interviewId]);

  // Build URL without OTP
  const baseUrl = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;
  const swipeUrl = `${baseUrl}/swipe/${interviewId}`;

  // Trigger refresh animation on mount
  useEffect(() => {
    setIsRefreshing(true);
    setQrKey(prev => prev + 1);
    const timer = setTimeout(() => setIsRefreshing(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const copyOtp = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6 !bg-[#0a0a0a] !border-[#1a1a1a] text-white relative overflow-hidden shadow-xl isolate mb-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-transparent to-transparent opacity-50 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left side - Bold Typography */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-white">
                <Smartphone className="h-4 w-4 text-black" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">MOBILE REVIEW</span>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight leading-none">
              Review on
              <span className="text-gray-500 ml-2">the go</span>
            </h3>

            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-400">
                Swipe through interviews anywhere or{" "}
                <a
                  href={swipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline font-semibold"
                >
                  open here
                </a>
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-gray-500 font-mono bg-[#1a1a1a] px-2 py-1 rounded border border-[#2a2a2a] truncate flex-1">
                  {swipeUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(swipeUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="h-6 px-2 hover:bg-white/10 text-xs"
                >
                  {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-gray-400" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - QR and Features */}
          <div className="flex items-center gap-6">
            {/* Feature Pills */}
            <div className="hidden md:flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs text-gray-300 font-medium">AI Insights</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <Heart className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-xs text-gray-300 font-medium">Swipe Interface</span>
              </div>
            </div>

            {/* QR Code with number badge */}
            <div className="relative flex-shrink-0">
              <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
                01
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xl relative transition-all duration-200">
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/98 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 gap-1.5 animate-fade-in">
                    <Loader2 className="h-7 w-7 text-black animate-spin" />
                    <span className="text-[9px] font-bold text-black uppercase tracking-wider">Updating</span>
                  </div>
                )}
                <div className={`transition-all duration-200 ${isRefreshing ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
                  <QRCodeSVG
                    key={qrKey}
                    value={swipeUrl}
                    size={100}
                    level="H"
                    includeMargin={false}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              <p className="text-[10px] text-center text-gray-500 mt-1.5 font-medium">
                {isRefreshing ? "Updating..." : "Scan to review"}
              </p>

              {/* OTP Display - Compact */}
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="bg-white px-2.5 py-1 rounded-md font-mono text-sm font-bold text-black tracking-wider">
                    {otp}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyOtp}
                    className="h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Pro tip:</span> Review interviews during commute, lunch breaks, or wherever you are
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
