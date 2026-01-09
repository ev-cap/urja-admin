"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader } from "@/components/ui/loader";
import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[Landing] User authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <Loader />;
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Emerald Glow Background - Light mode */}
      <div
        className="fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)
          `,
          backgroundSize: "100% 100%",
        }}
      />
      
      {/* Emerald Void - Dark mode */}
      <div
        className="fixed inset-0 z-0 hidden dark:block"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #072607 100%)",
        }}
      />
      
      {/* Logo and Theme toggle */}
      <div className="fixed top-6 left-6 z-50">
        {resolvedTheme === 'dark' ? (
          <Image
            src="/admin_rool_white_logo.png"
            alt="ROOL Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <Image
            src="/admin_rool_black_logo.png"
            alt="ROOL Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
          />
        )}
      </div>
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-32 md:pt-40">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-10 flex justify-center items-center">
            {resolvedTheme === 'dark' ? (
              <Image
                src="/admin_rool_text_white_logo.png"
                alt="ROOL Admin Logo"
                width={500}
                height={120}
                priority
                className="w-auto h-32 md:h-40 object-contain"
              />
            ) : (
              <Image
                src="/admin_rool_text_black_logo.png"
                alt="ROOL Admin Logo"
                width={500}
                height={120}
                priority
                className="w-auto h-32 md:h-40 object-contain"
              />
            )}
          </div>
          
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-md mx-auto font-medium">
            Administration Dashboard
          </p>
        </div>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-gray-200/80 dark:border-gray-700/50 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
            <CardContent className="p-10 md:p-14">
              <div className="space-y-5">
                {/* Sign In */}
                <div className="space-y-5">
                  <div className="text-center mb-6">
                    <CardTitle className="text-2xl md:text-3xl mb-3 font-bold text-gray-900 dark:text-white">
                      Sign In
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                      Access your account
                    </CardDescription>
                  </div>
                  
                  <Link href="/auth/signin" className="block">
                    <Button 
                      className="w-full h-14 text-lg font-semibold group bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl" 
                      size="lg"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Sign In
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
