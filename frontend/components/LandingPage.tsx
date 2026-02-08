"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, firebaseEnabled } from "../lib/firebase";

/* ─── Feature data ──────────────────────────────────────────── */

const FEATURES = [
  {
    indicator: "green",
    title: "Real-Time Signal Discovery",
    description:
      "Our AI scrapes government databases, council minutes, and procurement portals to surface opportunities the moment they appear.",
  },
  {
    indicator: "blue",
    title: "Semantic Matching",
    description:
      "Describe your startup once. Argus uses embeddings and keyword analysis to rank every signal by relevance to your capabilities.",
  },
  {
    indicator: "orange",
    title: "Global Coverage",
    description:
      "Signals are geocoded and plotted on a 3D globe. See where government demand is emerging across cities, states, and countries.",
  },
  {
    indicator: "blue",
    title: "AI-Generated Outreach",
    description:
      "Get personalized email drafts that reference specific budgets, timelines, and stakeholders — ready to send.",
  },
];

const STEPS = [
  { number: "01", title: "Describe", detail: "Enter what your startup does." },
  {
    number: "02",
    title: "Analyze",
    detail: "Argus scans live government data sources.",
  },
  {
    number: "03",
    title: "Match",
    detail: "AI ranks signals by relevance to your capabilities.",
  },
  {
    number: "04",
    title: "Engage",
    detail: "View details, stakeholders, and draft outreach.",
  },
];

/* ─── Login Modal ───────────────────────────────────────────── */

function LoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      switch (code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Incorrect email or password.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/email-already-in-use":
          setError("Email already registered.");
          break;
        case "auth/weak-password":
          setError("Password too weak (min 6 chars).");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Wait and retry.");
          break;
        default:
          setError(isSignUp ? "Signup failed." : "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm border border-gray-800 bg-[#0A0F1A] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">
              {isSignUp ? "Create Account" : "Sign In"}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {isSignUp
                ? "Get started with Argus"
                : "Access your dashboard"}
            </div>
          </div>
          <button
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-gray-800 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-800 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-gray-600 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center text-[11px] text-gray-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className="text-blue-400 hover:text-blue-300 transition-colors"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Landing Page ──────────────────────────────────────────── */

export function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const goToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Nav ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between border-b border-gray-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-tight text-white">
            Argus
          </span>
          <span className="text-[10px] text-gray-600">v2.1</span>
        </div>

        <div className="flex items-center gap-6 text-[11px]">
          <a href="#features" className="text-gray-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
            How It Works
          </a>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-500 truncate max-w-[140px]">
                {user.email}
              </span>
              <button
                className="border border-gray-700 px-3 py-1.5 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                onClick={goToDashboard}
              >
                Dashboard
              </button>
              <button
                className="text-gray-500 hover:text-gray-300 transition-colors"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : firebaseEnabled ? (
            <button
              className="border border-gray-600 bg-white/5 px-4 py-1.5 text-gray-300 hover:bg-white/10 transition-colors"
              onClick={() => setShowLogin(true)}
            >
              Sign In
            </button>
          ) : (
            <button
              className="border border-gray-600 bg-white/5 px-4 py-1.5 text-gray-300 hover:bg-white/10 transition-colors"
              onClick={goToDashboard}
            >
              Open Dashboard
            </button>
          )}
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-8 py-24 overflow-hidden">
        {/* Subtle scan line */}
        <div className="hero-scanline" />

        <div className="relative text-center max-w-2xl">
          <div className="landing-fade-in mb-4 inline-flex items-center gap-2 border border-gray-800 px-3 py-1 text-[10px] uppercase tracking-widest text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            Government Intelligence Platform
          </div>

          <div className="landing-fade-in-d1">
            <h1 className="title-shimmer text-7xl font-black tracking-tighter leading-none sm:text-8xl">
              ARGUS
            </h1>
          </div>

          <h2 className="landing-fade-in-d2 mt-6 text-2xl font-bold tracking-tight text-white leading-tight sm:text-3xl">
            Know what governments need
            <br />
            <span className="text-gray-500">before they post the RFP.</span>
          </h2>

          <p className="landing-fade-in-d3 mt-6 text-base text-gray-400 leading-relaxed max-w-lg mx-auto">
            Argus monitors government procurement signals in real-time, matches
            them to your startup capabilities, and generates personalized
            outreach — all powered by AI.
          </p>

          <div className="landing-fade-in-d4 mt-10 flex items-center justify-center gap-4">
            <button
              className="border border-gray-600 bg-white/5 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              onClick={() => {
                if (user || !firebaseEnabled) {
                  goToDashboard();
                } else {
                  setShowLogin(true);
                }
              }}
            >
              {user ? "Open Dashboard" : "Get Started"}
            </button>
            <a
              href="#how-it-works"
              className="px-6 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="landing-fade-in-d4 mt-20 w-full max-w-3xl">
          <div className="landing-grid h-px w-full" />
          <div className="mt-8 grid grid-cols-3 gap-px">
            {[
              { label: "Signals Tracked", value: "Real-Time" },
              { label: "Match Accuracy", value: ">85%" },
              { label: "Response Time", value: "<3s" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="text-center stat-value"
                style={{ animationDelay: `${0.7 + i * 0.12}s` }}
              >
                <div className="text-lg font-semibold text-white panel-value">
                  {stat.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section id="features" className="border-t border-gray-800 px-8 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-gray-500">
              Capabilities
            </div>
            <h2 className="text-2xl font-bold text-white">
              Intelligence at every step
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="feature-card border border-gray-800/50 p-6"
                style={{
                  animation: `landingFadeIn 0.6s ${0.1 + i * 0.1}s ease-out both`,
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 panel-indicator-${f.indicator}`}
                  />
                  <span className="text-xs font-semibold text-white">
                    {f.title}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="border-t border-gray-800 px-8 py-20"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-gray-500">
              Process
            </div>
            <h2 className="text-2xl font-bold text-white">How it works</h2>
          </div>

          <div className="grid grid-cols-1 gap-px sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.number}
                className="relative border border-gray-800/50 p-6"
                style={{
                  animation: `landingFadeIn 0.6s ${0.1 + i * 0.12}s ease-out both`,
                }}
              >
                <div className="mb-3 text-2xl font-bold text-gray-800">
                  {s.number}
                </div>
                <div className="mb-1 text-xs font-semibold text-white">
                  {s.title}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {s.detail}
                </p>
                {i < STEPS.length - 1 && (
                  <div className="step-arrow absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-gray-600 sm:block">
                    &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 px-8 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h3 className="text-xl font-bold text-white">
            Ready to find your next government contract?
          </h3>
          <p className="mt-3 text-sm text-gray-500">
            Start matching your capabilities to live procurement signals.
          </p>
          <button
            className="mt-6 border border-gray-600 bg-white/5 px-8 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            onClick={() => {
              if (user || !firebaseEnabled) {
                goToDashboard();
              } else {
                setShowLogin(true);
              }
            }}
          >
            {user ? "Go to Dashboard" : "Get Started"}
          </button>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 px-8 py-4 flex items-center justify-between text-[10px] text-gray-600">
        <span>Argus v2.1</span>
        <span>Government Intelligence Platform</span>
      </footer>

      {/* ─── Login Modal ──────────────────────────────────────── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            goToDashboard();
          }}
        />
      )}
    </div>
  );
}
