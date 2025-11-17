import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
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
    } catch (error: unknown) {
      console.error('Login failed:', error);
      let errorMessage = 'Login failed';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.webp" alt="POS E2NK Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-3xl font-bold text-gray-800">MyPOS</h1>
          </div>
          <p className="text-gray-600">Point of Sale System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
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
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-slate-900 to-blue-900 text-white py-3 rounded-lg font-semibold hover:from-slate-800 hover:to-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-5 h-5" />
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
