/**
 * SwipeQRSection — "Review on the go" card on InterviewDetails.
 *
 * Re-skinned to the finance-trust palette: paper card with gold accent
 * QR badge, ink wordmark, mono OTP. No dark backgrounds.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Heart, Brain, Loader2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface SwipeQRSectionProps {
  interviewId: string;
}

export function SwipeQRSection({ interviewId }: SwipeQRSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrKey, setQrKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [otp, setOtp] = useState<string>("");

  useEffect(() => {
    const fetchOtp = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/swipe/session/${interviewId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setOtp(data.otp);
        }
      } catch (error) {
        console.error("Error fetching OTP:", error);
      }
    };
    fetchOtp();
  }, [interviewId]);

  const baseUrl = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;
  const swipeUrl = `${baseUrl}/swipe/${interviewId}`;

  useEffect(() => {
    setIsRefreshing(true);
    setQrKey((prev) => prev + 1);
    const timer = setTimeout(() => setIsRefreshing(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(swipeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyOtp = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6 mb-6 bg-paper border border-rule shadow-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: title + share URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-md bg-gold-soft">
              <Smartphone className="h-4 w-4 text-gold-ink" />
            </div>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Mobile review
            </span>
          </div>

          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink mb-1">
            Review on the go
          </h3>
          <p className="text-sm text-muted mb-4">
            Swipe through applicants anywhere — open on your phone via QR or this link.
          </p>

          <div className="flex items-center gap-2 max-w-md">
            <code className="text-xs text-ink-soft font-mono bg-paper-2 px-3 py-2 rounded-md border border-rule truncate flex-1">
              {swipeUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copyUrl}
              className="h-9 px-3"
              aria-label="Copy swipe URL"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Feature pills */}
          <div className="hidden md:flex items-center gap-3 mt-5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-2 border border-rule">
              <Brain className="h-3.5 w-3.5 text-gold-ink" />
              <span className="text-xs text-ink-soft font-medium">AI insights</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-2 border border-rule">
              <Heart className="h-3.5 w-3.5 text-danger" />
              <span className="text-xs text-ink-soft font-medium">Swipe interface</span>
            </div>
          </div>
        </div>

        {/* Right: QR + OTP */}
        <div className="shrink-0">
          <div className="relative">
            <div className="absolute -top-2 -right-2 bg-gold text-ink text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md z-10 shadow-1">
              01
            </div>
            <div className="p-3 bg-paper rounded-lg border border-rule shadow-1 relative">
              {isRefreshing && (
                <div className="absolute inset-0 bg-paper/95 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center z-10 gap-1.5">
                  <Loader2 className="h-7 w-7 text-ink animate-spin" />
                  <span className="text-[9px] font-mono text-muted">
                    Updating
                  </span>
                </div>
              )}
              <div
                className={`transition-all duration-200 ${isRefreshing ? "opacity-30 scale-95" : "opacity-100 scale-100"}`}
              >
                <QRCodeSVG
                  key={qrKey}
                  value={swipeUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                  fgColor="#0F1729"
                  bgColor="#FFFFFF"
                />
              </div>
            </div>
            <p className="text-[10px] font-mono text-muted text-center mt-2">
              {isRefreshing ? "Updating…" : "Scan to review"}
            </p>

            {/* OTP */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <div className="bg-paper-2 border border-rule px-3 py-1.5 rounded-md font-mono text-sm font-semibold text-ink tabular-nums tracking-wider">
                {otp || "------"}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyOtp}
                className="h-8 w-8 p-0"
                aria-label="Copy OTP"
                disabled={!otp}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pro tip */}
      <div className="mt-5 pt-4 border-t border-rule">
        <p className="text-xs text-muted">
          <span className="font-semibold text-ink-soft">Pro tip:</span>{" "}
          Review applicants during commute, lunch breaks, or wherever you are.
        </p>
      </div>
    </Card>
  );
}
