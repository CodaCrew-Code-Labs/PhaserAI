// AWS Cognito Authentication Service
import { Amplify } from 'aws-amplify';
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { amplifyConfig } from './cognito-config';

// Initialize Amplify
Amplify.configure(amplifyConfig);

export interface CognitoUser {
  userId: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthError {
  name: string;
  message: string;
}

// Sign up with email and password
export async function cognitoSignUp(
  email: string,
  password: string,
  username: string
): Promise<{ isSignUpComplete: boolean; userId?: string; nextStep?: string }> {
  try {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          preferred_username: username,
        },
      },
    });

    return {
      isSignUpComplete: result.isSignUpComplete,
      userId: result.userId,
      nextStep: result.nextStep?.signUpStep,
    };
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Confirm sign up with verification code
export async function cognitoConfirmSignUp(email: string, code: string): Promise<boolean> {
  try {
    const result = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
    return result.isSignUpComplete;
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Resend verification code
export async function cognitoResendCode(email: string): Promise<void> {
  try {
    await resendSignUpCode({ username: email });
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Sign in with email and password
export async function cognitoSignIn(email: string, password: string): Promise<CognitoUser> {
  try {
    const result = await signIn({
      username: email,
      password,
    });

    if (result.isSignedIn) {
      return await getCurrentCognitoUser();
    }

    throw new Error('Sign in incomplete. Additional steps required.');
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Sign in with Google OAuth
export async function cognitoSignInWithGoogle(): Promise<void> {
  try {
    await signInWithRedirect({ provider: 'Google' });
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Sign out
export async function cognitoSignOut(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Get current authenticated user
export async function getCurrentCognitoUser(): Promise<CognitoUser | null> {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();

    return {
      userId: user.userId,
      username: attributes.preferred_username || attributes.email?.split('@')[0] || user.username,
      email: attributes.email || '',
      emailVerified: attributes.email_verified === 'true',
    };
  } catch {
    return null;
  }
}

// Get current session (for API calls)
export async function getAuthSession() {
  try {
    const session = await fetchAuthSession();
    return {
      accessToken: session.tokens?.accessToken?.toString(),
      idToken: session.tokens?.idToken?.toString(),
      isValid: !!session.tokens,
    };
  } catch {
    return { accessToken: undefined, idToken: undefined, isValid: false };
  }
}

// Request password reset
export async function cognitoForgotPassword(email: string): Promise<void> {
  try {
    await resetPassword({ username: email });
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Confirm password reset with code
export async function cognitoConfirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  try {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  } catch (error) {
    throw formatAuthError(error);
  }
}

// Format auth errors for better UX
function formatAuthError(error: unknown): AuthError {
  const err = error as { name?: string; message?: string };

  const errorMessages: Record<string, string> = {
    UserNotFoundException: 'No account found with this email',
    NotAuthorizedException: 'Incorrect email or password',
    UserNotConfirmedException: 'Please verify your email first',
    UsernameExistsException: 'An account with this email already exists',
    InvalidPasswordException: 'Password does not meet requirements',
    CodeMismatchException: 'Invalid verification code',
    ExpiredCodeException: 'Verification code has expired',
    LimitExceededException: 'Too many attempts. Please try again later',
    InvalidParameterException: 'Invalid input provided',
  };

  return {
    name: err.name || 'AuthError',
    message: errorMessages[err.name || ''] || err.message || 'An authentication error occurred',
  };
}
