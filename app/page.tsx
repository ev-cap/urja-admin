import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Urja Admin
          </h1>
          <p className="text-xl text-muted-foreground">
            Powerful dashboard for managing your application
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Access your existing account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/signin">
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Sign Up</CardTitle>
              <CardDescription>
                Create a new account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline" size="lg">
                  Sign Up
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-muted-foreground">
              Continue to Dashboard →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
