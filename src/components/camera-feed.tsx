
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { recognizeSignLanguage } from '@/ai/flows/recognize-sign-language';
import { useToast } from '@/hooks/use-toast';
import { Camera, CameraOff, MessageSquareText, Loader2, AlertTriangle, Zap, Trash2, Copy } from 'lucide-react';
import { cn } from "@/lib/utils";

const RECOGNITION_INTERVAL_MS = 5000; // Recognize every 5 seconds

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string>(""); // Store the accumulating sentence
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    setIsCameraLoading(true);
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }
    setIsCameraActive(false);
    setError(null);
    setIsCameraLoading(false);
    setRecognizedText(""); // Clear sentence when camera stops
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsCameraLoading(true);
    setRecognizedText(""); // Reset sentence when (re)starting camera

    if (!videoRef.current) {
      setError("Video element not ready. Please try again.");
      setIsCameraLoading(false);
      return;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    videoRef.current.srcObject = null;
    videoRef.current.onloadedmetadata = null;
    videoRef.current.onerror = null;
    setIsCameraActive(false);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          mediaStreamRef.current = stream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setIsCameraActive(true);
              setError(null);
            }).catch(playError => {
              console.error("Error playing video:", playError);
              setError("Could not play video. Autoplay might be blocked.");
              setIsCameraActive(false);
              stopCamera();
            }).finally(() => {
              setIsCameraLoading(false);
            });
          };

          videoRef.current.onerror = () => {
            setError("Video stream error. Camera might be disconnected or an issue occurred.");
            setIsCameraActive(false);
            stopCamera();
            setIsCameraLoading(false);
          };
        } else {
          stream.getTracks().forEach(track => track.stop());
          setError("Video element reference lost during camera start.");
          setIsCameraActive(false);
          setIsCameraLoading(false);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        let errorMessage = "Could not access camera. Please check permissions.";
        if (err instanceof Error) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMessage = "Camera access denied. Please enable permissions in browser settings.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                errorMessage = "No camera found. Ensure a camera is connected and enabled.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                errorMessage = "Camera is in use or unreadable. Try closing other apps/tabs using the camera.";
            } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
                errorMessage = "Camera does not support requested settings (e.g., resolution).";
            } else if (err.name === "AbortError") {
                errorMessage = "Camera access request was aborted by the browser or user.";
            } else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }
        }
        setError(errorMessage);
        toast({
          title: "Camera Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsCameraActive(false);
        setIsCameraLoading(false);
      }
    } else {
      setError("Camera API (getUserMedia) is not supported by this browser.");
      toast({
        title: "Browser Incompatible",
        description: "Your browser does not support the necessary camera API.",
        variant: "destructive",
      });
      setIsCameraActive(false);
      setIsCameraLoading(false);
    }
  }, [toast, stopCamera]);

  useEffect(() => {
    if (!isCameraActive && !isCameraLoading && !error) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []); 

  const performRecognition = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isRecognizing) {
      return;
    }

    setIsRecognizing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUri = canvas.toDataURL('image/jpeg');

      try {
        const result = await recognizeSignLanguage({ photoDataUri });
        if (result.recognizedText) {
          const newWord = result.recognizedText.trim();
          if (newWord) { 
            setRecognizedText(prevText => 
              prevText ? `${prevText} ${newWord}` : newWord
            );
          }
        }
      } catch (err) {
        console.error("Error recognizing sign:", err);
        if (err instanceof Error && (err.message.includes('429') || err.message.toLowerCase().includes('quota'))) {
            toast({
              title: "API Rate Limit Exceeded",
              description: "Too many recognition attempts. Please wait a moment. The interval has been adjusted.",
              variant: "destructive",
            });
        } else {
            toast({
              title: "Recognition Error",
              description: "Could not recognize the sign. Will keep trying.",
              variant: "destructive",
            });
        }
      }
    } else {
      toast({
        title: "Capture Error",
        description: "Failed to capture image from camera.",
        variant: "destructive",
      });
    }
    setIsRecognizing(false);
  }, [isCameraActive, isRecognizing, toast]); 

  useEffect(() => {
    if (isCameraActive && !isRecognizing) { 
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
      recognitionIntervalRef.current = setInterval(() => {
        performRecognition();
      }, RECOGNITION_INTERVAL_MS);
    } else {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, [isCameraActive, isRecognizing, performRecognition]);

  const clearRecognizedText = () => {
    setRecognizedText("");
    toast({
      title: "Sentence Cleared",
      description: "The recognized sentence has been cleared.",
    });
  };

  const copyRecognizedText = async () => {
    if (!recognizedText) return;
    try {
      await navigator.clipboard.writeText(recognizedText);
      toast({
        title: "Sentence Copied",
        description: "The recognized sentence has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the sentence to your clipboard.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Camera className="w-6 h-6 text-primary" />
            Live Camera Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                { 'opacity-0': isCameraLoading || (!isCameraActive && !error) }
              )}
            />

            {(isCameraLoading || !isCameraActive) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-muted/90">
                {isCameraLoading ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-foreground">Initializing Camera...</p>
                  </>
                ) : error ? (
                  <>
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
                    <p className="text-destructive font-semibold">Camera Error</p>
                    <p className="text-muted-foreground text-sm mt-1 px-4">{error}</p>
                  </>
                ) : (
                  <>
                    <CameraOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Camera is off. Click "Start Camera" to begin.</p>
                  </>
                )}
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
            {isCameraActive ? (
                <Button onClick={stopCamera} variant="outline" className="w-full sm:w-auto" disabled={isCameraLoading}>
                <CameraOff className="mr-2 h-4 w-4" /> Stop Camera
                </Button>
            ) : (
                <Button onClick={startCamera} className="w-full sm:w-auto" disabled={isCameraLoading}>
                {isCameraLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Camera className="mr-2 h-4 w-4" />
                )}
                {isCameraLoading ? 'Starting...' : 'Start Camera'}
                </Button>
            )}
        </CardFooter>
      </Card>

      {error && !isCameraActive && !isCameraLoading && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertTriangle className="w-5 h-5"/>
          <p>{error}</p>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <MessageSquareText className="w-6 h-6 text-primary" />
            Recognized Sentence
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[60px] flex items-center justify-center p-4">
          {!isCameraActive ? (
             <p className="text-muted-foreground text-center">Start the camera to begin automatic recognition.</p>
          ) : recognizedText ? (
            <div className="flex items-center gap-2">
              <p className="text-xl md:text-2xl font-medium text-center">{recognizedText}</p>
              {isRecognizing && <Loader2 className="h-5 w-5 animate-spin text-primary/80" />}
            </div>
          ) : isRecognizing ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
             <p className="text-muted-foreground text-center flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Actively recognizing signs... Make a sign!
             </p>
          )}
        </CardContent>
        {isCameraActive && (
          <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-4 border-t">
            <Button 
              onClick={copyRecognizedText} 
              variant="outline" 
              size="sm"
              disabled={!recognizedText || isRecognizing}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Sentence
            </Button>
            <Button 
              onClick={clearRecognizedText} 
              variant="outline" 
              size="sm"
              disabled={!recognizedText || isRecognizing}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear Sentence
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

