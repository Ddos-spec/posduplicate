import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const init = useAuthStore((state) => state.init);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mock login for now - check hardcoded admin credentials
      if (email === 'admin@mypos.com' && password === 'admin123') {
        // Store mock admin user in localStorage
        const mockAdminUser = {
          id: 0,
          email: 'admin@mypos.com',
          name: 'Super Admin',
          role: { name: 'Super Admin' },
          tenant: null
        };
        localStorage.setItem('user', JSON.stringify(mockAdminUser));
        localStorage.setItem('token', 'mock-admin-token');

        // Re-initialize auth store to load from localStorage
        init();

        toast.success('Admin login successful!');
        navigate('/admin/dashboard');
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600">MyPOS System Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="admin@mypos.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-5 h-5" />
            {isLoading ? 'Logging in...' : 'Login as Admin'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">Email: admin@mypos.com</p>
            <p className="font-medium">Password: admin123</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to user login
          </a>
        </div>
      </div>
    </div>
  );
}
