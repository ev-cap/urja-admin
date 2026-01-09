"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useAuth, useSession } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountryCodeSelect, getCountryCodeDigits } from "@/components/ui/country-code-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clerkConfig } from "@/lib/clerk/config";
import { checkUserExistsAndGetUser } from "@/lib/services/userService";
import { AlertCircle } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, signOut: clerkSignOut } = useAuth();
  const { session } = useSession();
  
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [formattedPhone, setFormattedPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [permissionErrorOpen, setPermissionErrorOpen] = useState(false);

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
      const formatted = `${countryCode}${cleanPhone}`;
      setFormattedPhone(formatted);
      
      console.log('[SignIn] Attempting sign in with phone:', {
        formatted: formatted,
        countryCode,
        number: cleanPhone,
      });

      // Create sign-in with phone number as identifier
      // Note: User must already exist and phone must be enabled as sign-in method in Clerk dashboard
      const signInAttempt = await signIn.create({
        identifier: formatted,
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
        
        // Wait a moment for the session to be available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the session to get the token
        const currentSession = signInAttempt.createdSessionId;
        console.log('[SignIn] Session created:', currentSession);

        // Check user role before redirecting
        // Note: Role check will also happen in dashboard layout, but we do it here
        // to prevent unnecessary redirects and provide immediate feedback
        try {
          // Wait for session to be available and get token
          let token: string | null = null;
          let retries = 0;
          const maxRetries = 10;
          
          while (!token && retries < maxRetries) {
            try {
              // Wait a bit for session to be ready
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Try to get the session from Clerk
              // After setActive, the session should be available via useSession hook
              // We need to wait for it to be ready
              if (session) {
                token = await session.getToken({ template: clerkConfig.jwtTemplateName });
              }
            } catch (tokenError) {
              console.warn('[SignIn] Waiting for session to be ready...', retries + 1);
              retries++;
            }
          }

          // If we still don't have a token, let the dashboard layout handle the role check
          if (!token) {
            console.warn('[SignIn] Could not get token immediately, redirecting to dashboard for role check');
            router.push('/dashboard');
            return;
          }

          // Use the stored formatted phone number
          const phoneToCheck = formattedPhone;
          
          if (!phoneToCheck) {
            // If no phone stored, let dashboard layout handle it
            console.warn('[SignIn] Phone number not stored, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }

          console.log('[SignIn] Checking user role for phone:', phoneToCheck.substring(0, 5) + '***');

          // Check user role
          const result = await checkUserExistsAndGetUser(phoneToCheck, {
            jwtToken: token,
            sessionId: currentSession,
          });

          if (result.exists && result.user) {
            // Check userRole field (primary) or role field (fallback)
            const userRole = (result.user.userRole || result.user.role || '').toLowerCase();
            const isAdmin = userRole.includes('admin') || userRole.includes('super-admin');
            
            if (!isAdmin) {
              console.warn('[SignIn] User does not have admin privileges:', userRole);
              setPermissionErrorOpen(true);
              // Sign out the user since they don't have access
              await clerkSignOut();
              return;
            }

            // User has admin privileges, redirect to dashboard
            console.log('[SignIn] User has admin privileges, redirecting to dashboard');
            router.push('/dashboard');
          } else {
            // User doesn't exist in backend
            console.warn('[SignIn] User not found in backend');
            setPermissionErrorOpen(true);
            await clerkSignOut();
          }
        } catch (roleCheckError: any) {
          console.error('[SignIn] Error checking user role:', roleCheckError);
          // On error, let dashboard layout handle it, but also show error modal
          setPermissionErrorOpen(true);
          try {
            await clerkSignOut();
          } catch (signOutError) {
            console.error('[SignIn] Error signing out:', signOutError);
          }
        }
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
                {/* Clerk CAPTCHA widget placeholder - required for bot protection */}
                <div id="clerk-captcha" data-cl-theme="auto" data-cl-size="flexible" />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !phone || phone.length !== getCountryCodeDigits(countryCode)}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
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

      {/* Permission Error Dialog */}
      <Dialog open={permissionErrorOpen} onOpenChange={setPermissionErrorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl">Access Denied</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2">
              You do not have the required permission privileges to access the administration dashboard.
              Only users with <strong>admin</strong> or <strong>super-admin</strong> roles can access this panel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              onClick={async () => {
                setPermissionErrorOpen(false);
                // Sign out the user and redirect to home
                try {
                  await clerkSignOut();
                } catch (err) {
                  console.error('[SignIn] Error signing out:', err);
                }
                router.push('/');
              }}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
