import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        toast.error('Invalid or expired reset link. Please request a new one.');
        navigate('/auth');
      }
    };
    checkSession();
  }, [navigate]);

  const validateInputs = () => {
    const newErrors: { password?: string; confirm?: string } = {};
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      navigate('/');
    }
  };

  if (!isValidSession) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'hsl(260 100% 3%)',
          backgroundImage: 'radial-gradient(circle at 15% 50%, hsl(239 84% 67% / 0.15) 0%, transparent 35%), radial-gradient(circle at 85% 30%, hsl(187 94% 43% / 0.12) 0%, transparent 35%)',
        }}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
          style={{
            borderTopColor: 'hsl(239 84% 67%)',
            borderRightColor: 'hsl(187 94% 43%)',
          }}
        />
      </div>
    );
  }

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
        
        {/* Reset Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
          
          <h2 className="text-xl font-semibold mb-1">Set new password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your new password below
          </p>
          
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">New Password</Label>
              <Input
                id="password"
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
            
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 rounded-xl bg-glass-surface border-glass-border focus:border-primary"
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">{errors.confirm}</p>
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
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
