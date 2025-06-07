
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { recognizeSignLanguage } from '@/ai/flows/recognize-sign-language';
import { useToast } from '@/hooks/use-toast';
import { Camera, CameraOff, ScanSearch, MessageSquareText, Loader2, AlertTriangle } from 'lucide-react';

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []); // videoRef and mediaStreamRef are stable, setIsCameraActive is stable

  const startCamera = useCallback(async () => {
    setError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          mediaStreamRef.current = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions.");
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please ensure permissions are granted.",
          variant: "destructive",
        });
        setIsCameraActive(false);
      }
    } else {
      setError("Camera API not supported by this browser.");
      toast({
        title: "Unsupported Browser",
        description: "Your browser does not support the camera API.",
        variant: "destructive",
      });
      setIsCameraActive(false); // Ensure state is updated
    }
  }, [toast]); // Dependencies: setIsCameraActive, setError are stable. videoRef, mediaStreamRef are stable. toast is likely stable.

  useEffect(() => {
    startCamera(); // Attempt to start camera on mount
    return () => {
      stopCamera(); // Ensure camera is stopped when component unmounts
    };
  }, [startCamera, stopCamera]);

  const handleRecognizeSign = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    setIsLoading(true);
    setError(null);
    setRecognizedText(null);

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
        setRecognizedText(result.recognizedText);
      } catch (err) {
        console.error("Error recognizing sign:", err);
        setError("Failed to recognize sign. Please try again.");
        toast({
          title: "Recognition Error",
          description: "Could not recognize the sign. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      setError("Failed to capture image from camera.");
      toast({
        title: "Capture Error",
        description: "Failed to capture image from camera.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
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
          <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
            {isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-muted-foreground p-4 text-center">
                <CameraOff className="w-16 h-16 mx-auto mb-2" />
                {error ? "Camera failed to start." : "Camera is off or initializing..."}
                <br />
                {error ? "Please check permissions and try again." : "If it doesn't start, try the button below."}
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          {!isCameraActive ? (
            <Button onClick={startCamera} className="w-full sm:w-auto">
              <Camera className="mr-2 h-4 w-4" /> Start Camera
            </Button>
          ) : (
            <>
              <Button onClick={stopCamera} variant="outline" className="w-full sm:w-auto">
                <CameraOff className="mr-2 h-4 w-4" /> Stop Camera
              </Button>
              <Button onClick={handleRecognizeSign} disabled={isLoading || !isCameraActive} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="mr-2 h-4 w-4" />
                )}
                Recognize Sign
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {error && !isCameraActive && ( // Show main error message only if camera is not active
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertTriangle className="w-5 h-5"/>
          <p>{error}</p>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <MessageSquareText className="w-6 h-6 text-primary" />
            Recognized Text
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[60px] flex items-center justify-center">
          {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {!isLoading && recognizedText && (
            <p className="text-2xl font-medium text-center">{recognizedText}</p>
          )}
          {!isLoading && !recognizedText && !error && ( // Adjusted condition
            <p className="text-muted-foreground text-center">Perform a sign and click "Recognize Sign" once the camera is active.</p>
          )}
           {!isLoading && !recognizedText && error && isCameraActive && ( // Error during recognition
            <p className="text-muted-foreground text-center">Recognition failed. Try again.</p>
          )}
           {!isLoading && !recognizedText && !isCameraActive && ( // Camera not active message
            <p className="text-muted-foreground text-center">Start the camera to begin recognition.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
