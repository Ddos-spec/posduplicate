import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Eye, EyeOff, Mail, Lock, Shield, Zap, Globe, HelpCircle, CheckCircle, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { isDark, toggleTheme } = useThemeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);

      const user = useAuthStore.getState().user;
      const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();

      toast.success('Login berhasil!');

      if (roleName === 'owner') {
        navigate('/module-selector');
      } else if (roleName === 'admin' || roleName === 'super admin' || roleName === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (roleName === 'cashier' || roleName === 'kasir') {
        navigate('/cashier');
      } else if (roleName === 'distributor' || roleName === 'produsen' || roleName === 'retail') {
        navigate(`/accounting/${roleName}`);
      } else if (roleName === 'accountant') {
        navigate('/accounting/dashboard');
      } else {
        navigate('/module-selector');
      }
    } catch (error: unknown) {
      console.error('Login failed:', error);
      let errorMessage = 'Login gagal';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'}`}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-xl transition-all ${isDark ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' : 'bg-white text-slate-600 hover:bg-gray-100 shadow-lg'}`}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Decorative Elements */}
        <div className={`absolute top-20 left-20 w-32 h-32 rounded-2xl rotate-12 hidden lg:block ${isDark ? 'bg-slate-700/30' : 'bg-indigo-100/50'}`} />
        <div className={`absolute bottom-20 right-20 w-40 h-40 rounded-full hidden lg:block ${isDark ? 'bg-slate-700/20' : 'bg-indigo-100/30'}`} />

        {/* Login Card */}
        <div className={`rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 transition-colors duration-300 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MyPOS</h1>
            </div>

            {/* Business Platform Badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <CheckCircle className="w-4 h-4 text-indigo-500" />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Business Platform</span>
            </div>

            {/* Subtitle */}
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Point of Sale • Accounting • Inventory
            </p>
          </div>

          {/* Sign In Header */}
          <div className="text-center mb-6">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign in to your account</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Access all your business modules</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email address</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Mail className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Lock className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 focus:outline-none transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-4 ${isDark ? 'bg-slate-800 text-gray-400' : 'bg-white text-gray-500'}`}>or</span>
            </div>
          </div>

          {/* View Demo Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className={`w-full py-3 rounded-xl border-2 font-semibold flex items-center justify-center gap-2 transition-all ${
                isDark 
                  ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500/10' 
                  : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Zap className="w-5 h-5" />
              View Live Demo (No Login)
            </button>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Explore all features in a simulated environment.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <Shield className="w-4 h-4 text-yellow-500" />
              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Secure Login</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Fast Access</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <Globe className="w-4 h-4 text-cyan-500" />
              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Multi-Module</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 text-sm flex-wrap gap-2">
        <button className={`flex items-center gap-2 transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}>
          <HelpCircle className="w-4 h-4" />
          Need help?
        </button>
        <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>© 2025 MyPOS Platform. All rights reserved.</p>
        <div className={`px-3 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          v2.0.0
        </div>
      </div>
    </div>
  );
}
