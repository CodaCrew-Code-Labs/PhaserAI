import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, CheckCircle, Star, Heart, Lock, KeyRound } from 'lucide-react';
import { cognitoForgotPassword, cognitoConfirmForgotPassword } from '@/lib/auth';
import { toast } from 'sonner';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type EmailFormData = z.infer<typeof emailSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onEmailSubmit = async (data: EmailFormData) => {
    setLoading(true);
    setError('');

    try {
      await cognitoForgotPassword(data.email);
      setUserEmail(data.email);
      setStep('reset');
      toast.success('Reset code sent to your email!');
    } catch (err) {
      console.error('Password reset error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Failed to send reset email');
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setLoading(true);
    setError('');

    try {
      await cognitoConfirmForgotPassword(userEmail, data.code, data.newPassword);
      setStep('success');
      toast.success('Password reset successfully! ✨');
    } catch (err) {
      console.error('Password reset error:', err);
      const authError = err as { message?: string };
      setError(authError.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B485]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        {step === 'success' ? (
          <>
            <CardHeader className="relative text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#A1FBFC]/40">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-2xl font-bold">Password Reset! ✨</CardTitle>
              <CardDescription className="text-slate-500">
                Your password has been successfully reset. You can now log in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full h-11 shadow-lg shadow-[#F269BF]/40"
              >
                Go to Login
              </Button>
            </CardContent>
          </>
        ) : step === 'reset' ? (
          <>
            <CardHeader className="relative text-center pb-2">
              <Link to="/" className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3">
                  <span className="text-white font-black text-2xl">P</span>
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">PhaserAI</span>
              </Link>
              <CardTitle className="text-slate-800 text-2xl font-bold">Reset Password 🔑</CardTitle>
              <CardDescription className="text-slate-500">
                Enter the code sent to <span className="font-semibold text-[#748BF6]">{userEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-2 border-red-200 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-700 font-medium">Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                      {...resetForm.register('code')}
                    />
                  </div>
                  {resetForm.formState.errors.code && (
                    <p className="text-sm text-red-500">{resetForm.formState.errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-700 font-medium">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                      {...resetForm.register('newPassword')}
                    />
                  </div>
                  {resetForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-500">{resetForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                      {...resetForm.register('confirmPassword')}
                    />
                  </div>
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
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
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[#748BF6] hover:text-[#F269BF] font-medium"
                  >
                    ← Back
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="relative text-center pb-2">
              <Link to="/" className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3 hover:rotate-6 transition-transform">
                  <span className="text-white font-black text-2xl">P</span>
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">PhaserAI</span>
              </Link>
              <CardTitle className="text-slate-800 text-2xl font-bold">Reset Password 🔑</CardTitle>
              <CardDescription className="text-slate-500">
                Enter your email to receive a password reset code
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-2 border-red-200 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#748BF6]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                      {...emailForm.register('email')}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  Remember your password?{' '}
                  <Link to="/login" className="text-[#F269BF] hover:text-[#748BF6] font-semibold">
                    Log in
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
