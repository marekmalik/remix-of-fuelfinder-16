import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Apple, Chrome, Share, PlusSquare, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-[env(safe-area-inset-top)]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              FuelFinder is already installed on your device. You can access it from your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Open App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Install FuelFinder</h1>
          <p className="text-muted-foreground">
            Add FuelFinder to your home screen for quick access and a native app experience.
          </p>
        </div>

        {/* Android / Chrome Install Button */}
        {deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Quick Install
              </CardTitle>
              <CardDescription>
                Click below to install FuelFinder directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstallClick} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Install on iOS
              </CardTitle>
              <CardDescription>
                Follow these steps to add FuelFinder to your home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Look for <Share className="h-4 w-4" /> at the bottom of Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Look for <PlusSquare className="h-4 w-4" /> Add to Home Screen
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    FuelFinder will appear on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (when no install prompt) */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Install on Android
              </CardTitle>
              <CardDescription>
                Follow these steps to add FuelFinder to your home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the menu button</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Look for <MoreVertical className="h-4 w-4" /> in Chrome
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Tap "Add to Home screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Or "Install app" if available
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    FuelFinder will appear on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Quick access from your home screen
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Works offline for viewing past activities
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Full-screen experience without browser UI
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Faster loading with cached resources
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          Continue in Browser
        </Button>
      </div>
    </div>
  );
};

export default Install;
