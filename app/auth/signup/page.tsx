"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountryCodeSelect, getCountryCodeDigits } from "@/components/ui/country-code-select";
import { clerkConfig } from "@/lib/clerk/config";

export default function SignUpPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive, isSignedIn } = useSignUp();
  
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[SignUp] User already signed in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  /**
   * Send OTP to phone number for sign up
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
      
      console.log('[SignUp] Creating account with phone:', {
        raw: formattedPhone,
        countryCode,
        number: cleanPhone,
      });

      // Start the sign-up process with phone number
      try {
        await signUp.create({
          phoneNumber: formattedPhone,
        });
      } catch (err: any) {
        console.error('[SignUp] Error creating account:', err);
        throw new Error(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Failed to create account');
      }

      console.log('[SignUp] Account created, preparing phone verification');

      // Send the OTP code to the user's phone
      await signUp.preparePhoneNumberVerification();

      console.log('[SignUp] OTP sent successfully');
      setVerifying(true);
    } catch (err: any) {
      console.error('[SignUp] Error sending OTP:', err);
      setError(err.errors?.[0]?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP code and complete sign up
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) return;
    
    setLoading(true);
    setError("");

    try {
      console.log('[SignUp] Verifying OTP code');

      // Verify the OTP code
      const signUpAttempt = await signUp.attemptPhoneNumberVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        console.log('[SignUp] Sign up complete, setting active session');
        
        // Set the active session
        await setActive({ session: signUpAttempt.createdSessionId });
        
        console.log('[SignUp] Session created:', signUpAttempt.createdSessionId);

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        console.error('[SignUp] Sign up not complete:', signUpAttempt.status);
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignUp] Error verifying OTP:', err);
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
              ROOl Admin
            </h1>
          </Link>
          <p className="text-muted-foreground">
            {verifying ? `Verify ${countryCode} ${phone}` : 'Create your admin account'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
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
                  Already have an account?{" "}
                  <Link href="/auth/signin" className="text-primary hover:underline">
                    Sign In
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
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
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
