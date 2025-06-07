import { AppLogo } from '@/components/app-logo';
import { CameraFeed } from '@/components/camera-feed';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-6 px-4 md:px-8 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <AppLogo />
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-headline font-semibold mb-2">
            Real-time Sign Language to Text
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Use your camera to perform sign language gestures. SignText will translate them into text below.
          </p>
        </div>
        
        <CameraFeed />
      </main>

      <footer className="py-6 px-4 md:px-8 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SignText. All rights reserved.</p>
          <p>Powered by AI.</p>
        </div>
      </footer>
    </div>
  );
}
