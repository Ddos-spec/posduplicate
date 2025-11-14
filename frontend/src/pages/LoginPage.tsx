import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast, { Toaster } from 'react-hot-toast';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);

      // Get user from store after login
      const user = useAuthStore.getState().user;
      // Backend sends 'roles' not 'role'
      const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();

      console.log('User logged in:', user);
      console.log('Role name:', roleName);

      toast.success('Login successful!');

      // Redirect based on role
      if (roleName === 'owner') {
        console.log('Redirecting to owner dashboard');
        navigate('/owner/dashboard');
      } else if (roleName === 'admin' || roleName === 'super admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin/dashboard');
      } else if (roleName === 'cashier' || roleName === 'kasir') {
        console.log('Redirecting to cashier');
        navigate('/cashier');
      } else {
        // Default to owner dashboard for other roles
        console.log('Redirecting to owner dashboard (default)');
        navigate('/owner/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">MyPOS</h1>
          <p className="text-gray-600">Multi-Tenant POS System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">Demo Accounts:</p>
          <div className="space-y-1">
            <p><strong>Admin:</strong> admin@mypos.com / admin123 (→ /admin/login)</p>
            <p><strong>Owner:</strong> owner@kebuliutsman.com / password123</p>
            <p><strong>Cashier:</strong> kasir@kebuliutsman.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
