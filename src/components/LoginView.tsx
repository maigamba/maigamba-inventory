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

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      const response = await inventoryApi.login(loginValue, password, rememberMe);

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
    <div className="min-h-screen w-full overflow-hidden bg-[#f5f7fb] text-slate-900 antialiased">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.08fr_0.92fr]">

        {/* ================================================================
            LEFT — MAIGAMBA TECHNOLOGY SHOWCASE
        ================================================================ */}
        <section className="relative hidden min-h-screen overflow-hidden bg-[#07111f] text-white lg:flex">
          {/* Main computer background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=2200&q=95')",
            }}
          />

          {/* Professional image treatment — keeps the computer visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#06101f]/80 via-[#06101f]/42 to-[#06101f]/12" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06101f]/95 via-[#06101f]/30 to-[#06101f]/15" />
          <div className="absolute inset-0 bg-[#07111f]/20" />

          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          {/* Top navigation / brand */}
          <div className="relative z-20 flex w-full items-start justify-between px-9 py-8 xl:px-12 xl:py-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white text-slate-950 shadow-2xl">
                <Monitor className="h-5.5 w-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-extrabold tracking-[0.24em]">
                    MAIGAMBA
                  </h1>
                  <span className="rounded-md border border-amber-300/35 bg-amber-300/10 px-1.5 py-0.5 text-[7px] font-extrabold tracking-[0.14em] text-amber-200">
                    TECH
                  </span>
                </div>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/45">
                  Computer Technology
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3.5 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.9)]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
                System Online
              </span>
            </div>
          </div>

          {/* Hero content */}
          <div className="absolute inset-x-0 top-[25%] z-10 px-9 xl:px-12">
            <div className="max-w-[690px]">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3.5 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-amber-200 backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure Staff Workspace
              </div>

              <h2 className="text-[48px] font-semibold leading-[1.02] tracking-[-0.045em] text-white xl:text-[66px]">
                Smarter technology.
                <span className="block text-white/65">
                  Better business.
                </span>
              </h2>

              <p className="mt-6 max-w-[600px] text-[14px] leading-7 text-white/62 xl:text-[15px]">
                A professional workspace for managing inventory, tracking
                sales, serving customers and growing your business with
                confidence.
              </p>
            </div>
          </div>

          {/* Four visual feature cards */}
          <div className="absolute inset-x-0 bottom-[106px] z-20 px-9 xl:px-12">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
                Everything in one workspace
              </p>
              <span className="text-[9px] font-medium text-white/35">
                Maigamba Inventory
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  icon: Laptop,
                  title: "Manage",
                  text: "Inventory",
                  image:
                    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=90",
                },
                {
                  icon: Monitor,
                  title: "Track",
                  text: "Sales",
                  image:
                    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=90",
                },
                {
                  icon: Cpu,
                  title: "Serve",
                  text: "Customers",
                  image:
                    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=90",
                },
                {
                  icon: Sparkles,
                  title: "Grow",
                  text: "Business",
                  image:
                    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=90",
                },
              ].map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group relative h-[122px] overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30"
                  >
                    <img
                      src={feature.image}
                      alt={`${feature.title} ${feature.text}`}
                      className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050b16]/95 via-[#050b16]/35 to-transparent" />

                    <div className="absolute left-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-[#07111f]/65 text-white backdrop-blur-md">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="absolute bottom-3.5 left-3.5">
                      <p className="text-[12px] font-bold text-white">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-white/55">
                        {feature.text}
                      </p>
                    </div>

                    <div className="absolute right-3.5 top-3.5 h-1.5 w-1.5 rounded-full bg-emerald-300 opacity-70" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom information */}
          <div className="absolute inset-x-9 bottom-7 z-20 border-t border-white/10 pt-4 xl:inset-x-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[9px] font-medium tracking-wide text-white/55">
                  Farm Center, Kano State, Nigeria
                </span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">
                Staff Portal • {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================
            RIGHT — LOGIN
        ================================================================ */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fc] px-5 py-8 sm:px-8">
          {/* Soft background details */}
          <div className="absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-amber-200/25 blur-3xl" />
          <div className="absolute -bottom-48 -left-48 h-[460px] w-[460px] rounded-full bg-blue-100/55 blur-3xl" />

          <div className="relative z-10 w-full max-w-[455px]">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold tracking-[0.18em] text-slate-950">
                    MAIGAMBA
                  </p>
                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Computer Technology
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-700">
                Online
              </span>
            </div>

            {/* Login card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,.11)]">
              {/* Card top accent */}
              <div className="h-1.5 bg-gradient-to-r from-slate-950 via-slate-800 to-amber-400" />

              <div className="p-7 sm:p-9">
                <div className="mb-8">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/15">
                      <Lock className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                        Authorized Access
                      </span>
                    </div>
                  </div>

                  <h3 className="text-[30px] font-bold tracking-[-0.035em] text-slate-950">
                    Welcome back
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    Sign in to access your Maigamba Inventory workspace.
                  </p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                  {/* Email / username */}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500"
                    >
                      Email or Username
                    </label>

                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700" />
                      <input
                        id="login-email"
                        name="staff-login"
                        type="text"
                        required
                        autoComplete="off"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="Enter your email or username"
                        className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500"
                      >
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[10px] font-semibold text-slate-400 transition-colors hover:text-slate-900"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700" />

                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-12 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 flex h-[52px] w-12 items-center justify-center text-slate-400 transition-colors hover:text-slate-900"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <label className="flex cursor-pointer select-none items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                    />
                    <span className="text-[11px] font-medium text-slate-500">
                      Remember me on this workstation
                    </span>
                  </label>

                  {/* Sign in */}
                  <button
                    id="btn-sign-in"
                    type="submit"
                    disabled={isLoading}
                    className="group flex h-[53px] w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-xl shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in to Inventory</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                {/* Security notice */}
                <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
                        Secure staff login
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-slate-400">
                        Protected access with authenticated sessions and
                        role-based permissions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span>Maigamba Computer Technology</span>
              <span>•</span>
              <span>Staff Portal</span>
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================
          FORGOT PASSWORD MODAL
      ================================================================ */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-gradient-to-r from-slate-950 to-amber-400" />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Lock className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="text-lg font-bold tracking-tight text-slate-950">
                    Reset staff credentials
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Staff passwords can be updated by an authorized
                    Administrator through the Users section.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
