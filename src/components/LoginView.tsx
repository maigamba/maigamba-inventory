import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserProfile } from '../types/inventory';
import { inventoryApi } from '../services/api';
import {
  Monitor,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Cpu,
  MapPin,
  Phone,
  Laptop,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, addToast } = useInventory();

  const [emailOrUsername, setEmailOrUsername] = useState(
    'admin@maigamba.com'
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginValue = emailOrUsername.trim();

    if (!loginValue || !password) {
      addToast(
        'warning',
        'Enter your staff email and password.',
        'Missing Credentials'
      );
      return;
    }

    setIsLoading(true);

    try {
      // The PostgreSQL API authenticates with email + password.
      // The backend returns the JWT token, user and effective permissions.
      const response = await inventoryApi.login(loginValue, password);

      if (!response?.success || !response?.data?.user) {
        throw new Error(
          response?.message ||
            'Authentication failed. Please check your credentials.'
        );
      }

      const apiUser = response.data.user;

      // --------------------------------------------------------------
      // EFFECTIVE PERMISSIONS
      // --------------------------------------------------------------
      //
      // These come directly from the backend permission service.
      // They already include:
      //   - role permissions
      //   - individually granted permissions
      //   - individually revoked permissions
      //
      const permissions = Array.isArray(response.data?.permissions)
        ? response.data.permissions
            .map((permission: unknown) => String(permission).trim())
            .filter(Boolean)
        : [];

      // Normalize PostgreSQL/API field names to the frontend UserProfile shape.
      const userSession: UserProfile = {
        UserID: String(
          apiUser?.userId ??
            apiUser?.UserID ??
            apiUser?.id ??
            ''
        ).trim(),

        Username: String(
          apiUser?.username ??
            apiUser?.Username ??
            apiUser?.email ??
            loginValue
        ).trim(),

        FullName: String(
          apiUser?.fullName ??
            apiUser?.FullName ??
            loginValue
        ).trim(),

        Email: String(
          apiUser?.email ??
            apiUser?.Email ??
            loginValue
        ).trim(),

        Phone:
          apiUser?.phone ??
          apiUser?.Phone ??
          undefined,

        Role: String(
          apiUser?.role ??
            apiUser?.Role ??
            'Sales Staff'
        ).trim(),

        Status: String(
          apiUser?.status ??
            apiUser?.Status ??
            'Active'
        ).trim(),

        Permissions: permissions,

        CreatedAt:
          apiUser?.createdAt ??
          apiUser?.CreatedAt ??
          new Date().toISOString(),

        UpdatedAt:
          apiUser?.updatedAt ??
          apiUser?.UpdatedAt,
      };

      // --------------------------------------------------------------
      // VALIDATE USER PROFILE
      // --------------------------------------------------------------

      if (!userSession.UserID || !userSession.Email) {
        throw new Error(
          'The server authenticated you but returned an incomplete user profile.'
        );
      }

      if (userSession.Status.toLowerCase() !== 'active') {
        inventoryApi.logout();

        throw new Error(
          'This staff account is not active. Contact an administrator.'
        );
      }

      // --------------------------------------------------------------
      // STORE SESSION
      // --------------------------------------------------------------

      login(userSession, rememberMe);

      // Useful for debugging the permission system during development.
      console.log(
        'Authenticated user:',
        userSession.FullName
      );

      console.log(
        'Effective permissions:',
        userSession.Permissions
      );

      setPassword('');
    } catch (error: any) {
      console.error('Staff login failed:', error);

      // Make sure a stale token is not left behind after a failed login.
      inventoryApi.clearAuthToken();

      addToast(
        'error',
        error?.message ||
          'Unable to sign in. Please check the server and your credentials.',
        'Authentication Failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (
    email: string,
    pass: string,
    role: string
  ) => {
    setEmailOrUsername(email);
    setPassword(pass);

    addToast(
      'info',
      `Pre-filled ${role} credentials`,
      'Quick Access'
    );
  };

  return (
    <div className="min-h-screen w-full flex bg-[#fcfaf7] text-[#1a1a1a] antialiased selection:bg-[#1a1a1a] selection:text-[#fcfaf7] relative overflow-hidden">
      <div className="relative z-10 w-full flex flex-col lg:flex-row min-h-screen">

        {/* LEFT SIDE */}
        <div className="lg:w-7/12 relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-black/15 bg-[#0f0f0f] text-[#fcfaf7] overflow-hidden">

          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity pointer-events-none scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1600&q=80')",
            }}
          />

          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#1a1a1a]/80 via-transparent to-transparent pointer-events-none" />

          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">

            {/* BRAND HEADER */}
            <div className="flex items-center justify-between gap-4 mb-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 border border-white/25 bg-[#202020] flex items-center justify-center text-white shadow-md">
                  <Monitor className="w-5 h-5 text-amber-200" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-serif tracking-widest text-white uppercase font-semibold">
                      MAIGAMBA
                    </h1>

                    <span className="text-[10px] text-amber-300 font-mono tracking-widest">
                      TECH
                    </span>
                  </div>

                  <p className="text-[9px] uppercase tracking-[0.3em] text-white/50 font-medium">
                    Computer Technology & Electronics
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/15 rounded-xs text-[11px] text-white/80">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-light">
                  Farm Center, Kano State
                </span>
              </div>
            </div>

            {/* HEADLINE */}
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[9px] uppercase tracking-[0.25em] text-amber-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  Enterprise Hub • Official Hardware Depot
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-serif text-white tracking-tight font-normal leading-[1.15]">
                Computer Systems, Components &{' '}
                <span className="italic font-light text-amber-100">
                  Commercial Ledger
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed max-w-lg">
                High-performance laptops, custom PC desktop towers,
                workstation components, point-of-sale register, and
                inventory management.
              </p>
            </div>

            {/* SHOWCASE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-8 max-w-2xl">

              <div className="group relative border border-white/15 bg-[#181818]/90 p-3 rounded-xs overflow-hidden transition-all hover:border-white/30">
                <div className="h-24 w-full rounded-xs overflow-hidden mb-2 bg-[#222]">
                  <img
                    src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80"
                    alt="Laptops & Ultrabooks"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white font-medium">
                  <span>Laptops & Notebooks</span>
                  <Laptop className="w-3.5 h-3.5 text-amber-300" />
                </div>

                <p className="text-[10px] text-white/50 font-light mt-0.5">
                  Core i5/i7/M-Series, ThinkPads, MacBooks
                </p>
              </div>

              <div className="group relative border border-white/15 bg-[#181818]/90 p-3 rounded-xs overflow-hidden transition-all hover:border-white/30">
                <div className="h-24 w-full rounded-xs overflow-hidden mb-2 bg-[#222]">
                  <img
                    src="https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=600&q=80"
                    alt="Desktops & Monitors"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white font-medium">
                  <span>Desktops & Displays</span>
                  <Monitor className="w-3.5 h-3.5 text-amber-300" />
                </div>

                <p className="text-[10px] text-white/50 font-light mt-0.5">
                  Gaming rigs, UltraSharp panels, towers
                </p>
              </div>

              <div className="group relative border border-white/15 bg-[#181818]/90 p-3 rounded-xs overflow-hidden transition-all hover:border-white/30">
                <div className="h-24 w-full rounded-xs overflow-hidden mb-2 bg-[#222]">
                  <img
                    src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&q=80"
                    alt="Processors & GPUs"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white font-medium">
                  <span>Components & Parts</span>
                  <Cpu className="w-3.5 h-3.5 text-amber-300" />
                </div>

                <p className="text-[10px] text-white/50 font-light mt-0.5">
                  SSDs, RAM, graphics, motherboards
                </p>
              </div>

            </div>
          </div>

          {/* STORE INFO */}
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10 space-y-4">
            <div className="p-4 bg-white/5 border border-white/15 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xs mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>

                <div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-amber-300 font-mono font-semibold block">
                    Store Location & Commercial Address
                  </span>

                  <p className="text-sm font-serif font-medium text-white tracking-wide mt-0.5">
                    No. 101 yayo Plaza farm Center Kano State. Nigeria
                  </p>

                  <p className="text-xs text-white/60 font-light mt-0.5">
                    Sales, Hardware Support, Device Repairs,
                    Wholesale & Retail Electronics
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-white/70 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                <div className="flex items-center gap-1.5 font-mono text-amber-200">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+234 800 MAIGAMBA</span>
                </div>

                <span className="text-[10px] text-white/40">
                  Mon - Sat: 8:30 AM - 7:00 PM
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.2em] text-white/40">
              <div>
                <span>
                  © {new Date().getFullYear()} Maigamba Computer Technology
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-white/60">Kano Hub</span>
                <span>•</span>

                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Sync Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#fcfaf7]">
          <div className="w-full max-w-md space-y-8">

            <div className="space-y-2 text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black/5 border border-black/10 rounded-full text-[9px] uppercase tracking-[0.2em] text-black/60 font-mono">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Staff Portal</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-serif text-[#1a1a1a] tracking-tight font-normal">
                Sign in to Console
              </h3>

              <p className="text-xs text-black/60 leading-relaxed font-light">
                Authorized access for Maigamba Computer Technology
                staff at No. 101 yayo Plaza farm Center Kano State.
              </p>
            </div>

            <form
              onSubmit={handleSignIn}
              className="space-y-5"
            >

              {/* USERNAME */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.2em]"
                >
                  Staff Email or Username
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                    <Mail className="w-4 h-4" />
                  </div>

                  <input
                    id="login-email"
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) =>
                      setEmailOrUsername(e.target.value)
                    }
                    placeholder="admin@maigamba.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-black/15 rounded-xs text-xs text-[#1a1a1a] placeholder-black/30 focus:outline-none focus:border-black transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.2em]"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowForgotPassword(true)
                    }
                    className="text-[10px] uppercase tracking-wider text-black/50 hover:text-black underline transition-colors"
                  >
                    Reset?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                    <Lock className="w-4 h-4" />
                  </div>

                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-black/15 rounded-xs text-xs text-[#1a1a1a] placeholder-black/30 focus:outline-none focus:border-black transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-black/40 hover:text-black transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                    className="w-3.5 h-3.5 rounded-xs accent-[#1a1a1a] border-black/30"
                  />

                  <span className="text-xs text-black/60 font-light">
                    Remember session on this workstation
                  </span>
                </label>
              </div>

              {/* SIGN IN */}
              <button
                id="btn-sign-in"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-[0.25em] font-semibold rounded-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>
                      Verifying Authority...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Enter Inventory Console
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-black/20 rounded-xs p-6 space-y-4 shadow-xl">

            <div className="flex items-center gap-3 text-[#1a1a1a]">
              <div className="p-2 border border-black/10 bg-[#f4f0ea]">
                <Lock className="w-4 h-4" />
              </div>

              <h4 className="text-base font-serif font-bold text-[#1a1a1a]">
                Reset Staff Credentials
              </h4>
            </div>

            <p className="text-xs text-black/70 leading-relaxed font-light">
              Staff passwords can be updated by an authorized
              Administrator through the Users section of the
              inventory system.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowForgotPassword(false)
                }
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};