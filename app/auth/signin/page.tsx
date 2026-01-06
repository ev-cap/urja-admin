"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountryCodeSelect, getCountryCodeDigits } from "@/components/ui/country-code-select";
import { clerkConfig } from "@/lib/clerk/config";

export default function SignInPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[SignIn] User already signed in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  /**
   * Send OTP to phone number
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) return;
    
    setLoading(true);
    setError("");

    try {
      // Validate phone number
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== getCountryCodeDigits(countryCode)) {
        setError(`Please enter a valid ${getCountryCodeDigits(countryCode)}-digit phone number`);
        setLoading(false);
        return;
      }

      // Format phone number with selected country code (E.164 format)
      const formattedPhone = `${countryCode}${cleanPhone}`;
      
      console.log('[SignIn] Attempting sign in with phone:', {
        formatted: formattedPhone,
        countryCode,
        number: cleanPhone,
      });

      // Create sign-in with phone number as identifier
      // Note: User must already exist and phone must be enabled as sign-in method in Clerk dashboard
      const signInAttempt = await signIn.create({
        identifier: formattedPhone,
      });
      
      console.log('[SignIn] SignIn object created:', {
        status: signInAttempt.status,
        supportedFactors: signInAttempt.supportedFirstFactors?.length || 0
      });

      console.log('[SignIn] Sign-in attempt created, preparing phone code factor');

      // Prepare the phone code verification
      const phoneNumberId = signInAttempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'phone_code' && 'phoneNumberId' in factor
      )?.phoneNumberId as string | undefined;

      if (!phoneNumberId) {
        console.error('[SignIn] Available factors:', signInAttempt.supportedFirstFactors);
        throw new Error('Phone authentication not available. Please ensure phone is enabled in Clerk dashboard.');
      }

      await signInAttempt.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: phoneNumberId,
      });

      console.log('[SignIn] OTP sent successfully');

      console.log('[SignIn] OTP sent successfully');
      setVerifying(true);
    } catch (err: any) {
      console.error('[SignIn] Error sending OTP:', err);
      
      // Check for specific error messages
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message;
      
      console.error('[SignIn] Full error details:', {
        message: errorMessage,
        code: err.errors?.[0]?.code,
        errors: err.errors,
      });
      
      if (errorMessage?.includes('already signed in') || err.errors?.[0]?.code === 'session_exists') {
        // User is already signed in, redirect to dashboard
        console.log('[SignIn] Already signed in, redirecting to dashboard');
        router.push('/dashboard');
        return;
      } else if (errorMessage?.includes('Identifier is invalid')) {
        setError('⚠️ Clerk Dashboard Configuration Required: Please enable "Phone number" as "Used for sign-in" in Clerk Dashboard → User & Authentication → Email, Phone, Username. See CLERK_FIX_REQUIRED.md for instructions.');
      } else if (errorMessage?.includes('not found')) {
        setError('Account not found. Please sign up first.');
      } else if (errorMessage?.includes('phone')) {
        setError('Phone authentication error. Check Clerk Dashboard configuration.');
      } else {
        setError(errorMessage || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP code
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) return;
    
    setLoading(true);
    setError("");

    try {
      console.log('[SignIn] Verifying OTP code');

      // Verify the OTP code
      const signInAttempt = await signIn.attemptFirstFactor({
        strategy: 'phone_code',
        code,
      });

      if (signInAttempt.status === 'complete') {
        console.log('[SignIn] Sign in complete, setting active session');
        
        // Set the active session
        await setActive({ session: signInAttempt.createdSessionId });
        
        // Get JWT token with custom template
        const session = signInAttempt.createdSessionId;
        console.log('[SignIn] Session created:', session);

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        console.error('[SignIn] Sign in not complete:', signInAttempt.status);
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignIn] Error verifying OTP:', err);
      setError(err.errors?.[0]?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset to phone entry
   */
  const handleBack = () => {
    setVerifying(false);
    setCode("");
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4">
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
      
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-foreground mb-2 cursor-pointer hover:text-primary transition-colors">
              ROOL Admin
            </h1>
          </Link>
          <p className="text-muted-foreground">
            {verifying ? `Verify ${countryCode} ${phone}` : 'Sign in with your phone number'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              {verifying 
                ? `Enter the 6-digit code sent to ${countryCode} ${phone}`
                : 'Select country code and enter your phone number'}
            </CardDescription>
          </CardHeader>

          {!verifying ? (
            <form onSubmit={handleSendCode}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex">
                    <CountryCodeSelect
                      value={countryCode}
                      onChange={setCountryCode}
                      disabled={loading}
                    />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={countryCode === "+91" ? "9876543210" : "2125551234"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={loading}
                      maxLength={getCountryCodeDigits(countryCode)}
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {countryCode === "+91" ? "Enter 10-digit mobile number" : "Enter 10-digit phone number"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !phone || phone.length !== getCountryCodeDigits(countryCode)}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{" "}
                  <Link href="/auth/signup" className="text-primary hover:underline">
                    Sign Up
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={loading}
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code sent to your phone
                  </p>
                  {countryCode === "+1" && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Testing: US numbers use OTP 424242
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleBack}
                  disabled={loading}
                >
                  Back
                </Button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
