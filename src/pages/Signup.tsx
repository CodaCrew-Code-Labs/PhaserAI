import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, AlertCircle, Star, Heart, KeyRound } from 'lucide-react';
import { cognitoSignUp, cognitoConfirmSignUp, cognitoResendCode, cognitoSignInWithGoogle } from '@/lib/auth';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const verificationSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

type SignupFormData = z.infer<typeof signupSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const verificationForm = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  const onSignup = async (data: SignupFormData) => {
    setLoading(true);
    setError('');

    try {
      const result = await cognitoSignUp(data.email, data.password, data.username);
      
      if (result.isSignUpComplete) {
        toast.success('Account created successfully! ✨');
        navigate('/login');
      } else {
        // Need email verification
        setUserEmail(data.email);
        setShowVerification(true);
        toast.success('Verification code sent to your email!');
      }
    } catch (err) {
      console.error('Signup error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Failed to create account');
      toast.error('Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (data: VerificationFormData) => {
    setLoading(true);
    setError('');

    try {
      await cognitoConfirmSignUp(userEmail, data.code);
      toast.success('Email verified! You can now log in ✨');
      navigate('/login');
    } catch (err) {
      console.error('Verification error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');

    try {
      await cognitoResendCode(userEmail);
      toast.success('New verification code sent!');
    } catch (err) {
      console.error('Resend error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      await cognitoSignInWithGoogle();
    } catch (err) {
      console.error('Google sign in error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Google sign in failed');
      setGoogleLoading(false);
    }
  };

  // Verification screen
  if (showVerification) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center p-4">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
        
        <Card className="relative w-full max-w-md bg-white/80 border-2 border-[#A1FBFC]/40 rounded-3xl shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#F269BF]/40">
              <KeyRound className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-slate-800 text-2xl font-bold">Verify Your Email ✉️</CardTitle>
            <CardDescription className="text-slate-500">
              We sent a 6-digit code to <span className="font-semibold text-[#748BF6]">{userEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verificationForm.handleSubmit(onVerify)} className="space-y-4">
              {error && (
                <Alert className="bg-red-50 border-2 border-red-200 rounded-2xl">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-700 font-medium">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-14"
                  {...verificationForm.register('code')}
                />
                {verificationForm.formState.errors.code && (
                  <p className="text-sm text-red-500">{verificationForm.formState.errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full h-11 shadow-lg shadow-[#F269BF]/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-sm text-[#F269BF] hover:text-[#748BF6] font-medium disabled:opacity-50"
                >
                  {resending ? 'Sending...' : "Didn't receive the code? Resend"}
                </button>
              </div>

              <div className="text-center text-sm text-slate-500">
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="text-[#748BF6] hover:text-[#F269BF] font-medium"
                >
                  ← Back to signup
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center p-4">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Decorative elements */}
      <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
      <Star className="absolute bottom-32 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
      <Heart className="absolute top-1/4 right-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />

      <Card className="relative w-full max-w-md bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative text-center pb-2">
          <Link to="/" className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3 hover:rotate-6 transition-transform">
              <span className="text-white font-black text-2xl">P</span>
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">PhaserAI</span>
          </Link>
          <CardTitle className="text-slate-800 text-2xl font-bold">Create Your Account ✨</CardTitle>
          <CardDescription className="text-slate-500">
            Start building your conlang lexicon today
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full border-2 border-slate-200 hover:border-[#748BF6] hover:bg-[#748BF6]/5 text-slate-700 font-semibold rounded-xl h-12 transition-all"
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-2 border-red-200 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                  {...signupForm.register('email')}
                />
              </div>
              {signupForm.formState.errors.email && (
                <p className="text-sm text-red-500">{signupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                <Input
                  id="username"
                  type="text"
                  placeholder="conlanger123"
                  className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                  {...signupForm.register('username')}
                />
              </div>
              {signupForm.formState.errors.username && (
                <p className="text-sm text-red-500">{signupForm.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                  {...signupForm.register('password')}
                />
              </div>
              {signupForm.formState.errors.password && (
                <p className="text-sm text-red-500">{signupForm.formState.errors.password.message}</p>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Password requirements:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#748BF6] rounded-full"></div>
                    At least 8 characters long
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#F269BF] rounded-full"></div>
                    Contains uppercase letter (A-Z)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#F5B485] rounded-full"></div>
                    Contains lowercase letter (a-z)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#A1FBFC] rounded-full"></div>
                    Contains number (0-9)
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                  {...signupForm.register('confirmPassword')}
                />
              </div>
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{signupForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full h-11 shadow-lg shadow-[#F269BF]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[#F269BF] hover:text-[#748BF6] font-semibold">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
