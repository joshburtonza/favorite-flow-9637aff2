import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  const validateInputs = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'hsl(260 100% 3%)',
        backgroundImage: 'radial-gradient(circle at 15% 50%, hsl(239 84% 67% / 0.15) 0%, transparent 35%), radial-gradient(circle at 85% 30%, hsl(187 94% 43% / 0.12) 0%, transparent 35%)',
      }}
    >
      <div className="w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div 
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
              boxShadow: '0 0 30px hsl(239 84% 67% / 0.5)',
            }}
          >
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Favorite Logistics</h1>
            <p className="text-sm text-muted-foreground">Premium Console</p>
          </div>
        </div>
        
        {/* Auth Card */}
        <div 
          className="glass-card"
          style={{ padding: '2rem' }}
        >
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'signin' 
                  ? 'text-foreground border border-primary/30' 
                  : 'text-muted-foreground'
              }`}
              style={{
                background: activeTab === 'signin' 
                  ? 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))' 
                  : 'transparent',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'signup' 
                  ? 'text-foreground border border-primary/30' 
                  : 'text-muted-foreground'
              }`}
              style={{
                background: activeTab === 'signup' 
                  ? 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))' 
                  : 'transparent',
              }}
            >
              Sign Up
            </button>
          </div>
          
          {activeTab === 'signin' ? (
            <>
              <h2 className="text-xl font-semibold mb-1">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your credentials to access your account
              </p>
              
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm text-muted-foreground">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm text-muted-foreground">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-medium" 
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1">Create an account</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your details to get started
              </p>
              
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm text-muted-foreground">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm text-muted-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm text-muted-foreground">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-medium" 
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure freight forwarding management
        </p>
      </div>
    </div>
  );
}
