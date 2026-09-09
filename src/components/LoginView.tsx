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
    <div className="min-h-screen w-full bg-slate-950 text-slate-900 antialiased">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.15fr_0.85fr]">

        {/* ================================================================
            BRAND / PRODUCT PANEL
        ================================================================ */}
        <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1800&q=85')",
            }}
          />

          {/* Ambient gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900" />
          <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-amber-400/[0.06] blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-blue-400/[0.04] blur-3xl" />

          <div className="relative z-10 flex min-h-screen flex-col justify-between p-8 xl:p-12">
            {/* Brand */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl">
                    <Monitor className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-bold tracking-[0.2em]">
                        MAIGAMBA
                      </h1>
                      <span className="rounded-full border border-amber-300/30 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-amber-300">
                        TECH
                      </span>
                    </div>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-slate-500">
                      Computer Technology
                    </p>
                  </div>
                </div>

                <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                  System Online
                </div>
              </div>

              {/* Hero */}
              <div className="mt-20 max-w-2xl xl:mt-28">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure Staff Workspace
                </div>

                <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
                  Manage your
                  <span className="block text-slate-300">
                    inventory with confidence.
                  </span>
                </h2>

                <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 xl:text-base">
                  A secure workspace for products, sales, purchases,
                  customers, expenses and business intelligence — built for
                  Maigamba Computer Technology.
                </p>
              </div>

              {/* Feature cards */}
              <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3">
                {[
                  {
                    icon: Laptop,
                    title: "Inventory",
                    text: "Products & stock",
                  },
                  {
                    icon: Monitor,
                    title: "Point of Sale",
                    text: "Fast checkout",
                  },
                  {
                    icon: Cpu,
                    title: "Analytics",
                    text: "Business insights",
                  },
                ].map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                    >
                      <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-amber-300 transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {feature.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom information */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-amber-300">
                    <MapPin className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Kano Hub
                    </p>
                    <p className="mt-0.5 text-xs text-slate-300">
                      Farm Center, Kano State, Nigeria
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <span>Maigamba Inventory</span>
                  <span>•</span>
                  <span>{new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            LOGIN PANEL
        ================================================================ */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-5 py-8 sm:px-8">
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-slate-200/60 blur-3xl" />

          <div className="relative z-10 w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Monitor className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold tracking-[0.18em] text-slate-950">
                    MAIGAMBA
                  </p>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Computer Technology
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>

            {/* Login card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.10)] sm:p-8">
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                  <Lock className="h-5 w-5" />
                </div>

                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  <ShieldCheck className="h-3 w-3" />
                  Authorized Access
                </div>

                <h3 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Welcome back
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to access your Maigamba Inventory workspace.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Email or Username
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="login-email"
                      type="text"
                      required
                      autoComplete="username"
                      value={emailOrUsername}
                      onChange={(e) =>
                        setEmailOrUsername(e.target.value)
                      }
                      placeholder="admin@maigamba.com"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/5"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[10px] font-semibold text-slate-400 transition-colors hover:text-slate-950"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/5"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-400 transition-colors hover:text-slate-950"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                  />
                  <span className="text-xs text-slate-500">
                    Remember me on this workstation
                  </span>
                </label>

                {/* Sign in */}
                <button
                  id="btn-sign-in"
                  type="submit"
                  disabled={isLoading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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

              {/* Security footer */}
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Secure staff login
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-400">
                    Access is protected by authenticated sessions and
                    role-based permissions.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Maigamba Computer Technology • Staff Portal
            </p>
          </div>
        </section>
      </div>

      {/* ================================================================
          FORGOT PASSWORD MODAL
      ================================================================ */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
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
      )}
    </div>
  );
};