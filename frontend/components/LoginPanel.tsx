"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, firebaseEnabled } from "../lib/firebase";

export function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
  }, []);

  const handleLogin = async () => {
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err, "signup"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setError(getAuthErrorMessage(err, "signout"));
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseEnabled) {
    return (
      <div className="panel-section">
        <div className="panel-header">
          <span className="panel-indicator panel-indicator-orange" />
          Account
        </div>
        <div className="text-xs text-gray-500">
          Firebase not configured. Add env vars to enable auth.
        </div>
      </div>
    );
  }

  return (
    <div className="panel-section">
      <div className="panel-header">
        <span className="panel-indicator panel-indicator-green" />
        Account
        <span className="ml-auto text-[10px] font-normal text-gray-500">
          {user ? "SIGNED IN" : "SIGNED OUT"}
        </span>
      </div>

      {user ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-300 truncate">{user.email}</div>
          <button
            className="w-full border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-900 transition-colors disabled:opacity-50"
            onClick={handleSignOut}
            disabled={loading}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="email"
            className="w-full border border-gray-800 bg-transparent px-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full border border-gray-800 bg-transparent px-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? (
            <div className="text-[10px] text-red-400">{error}</div>
          ) : null}
          <div className="flex gap-2">
            <button
              className="flex-1 border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              onClick={handleLogin}
              disabled={loading || !email || !password}
            >
              Sign In
            </button>
            <button
              className="flex-1 border border-gray-800 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-900 transition-colors disabled:opacity-50"
              onClick={handleSignup}
              disabled={loading || !email || !password}
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getAuthErrorMessage(
  err: unknown,
  context: "login" | "signup" | "signout",
) {
  const fallback =
    context === "signup"
      ? "Signup failed."
      : context === "signout"
        ? "Sign out failed."
        : "Login failed.";

  if (!err || typeof err !== "object") return fallback;

  const code = "code" in err ? String((err as { code?: string }).code) : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait and retry.";
    case "auth/email-already-in-use":
      return "Email already registered.";
    case "auth/weak-password":
      return "Password too weak (min 6 chars).";
    default:
      return fallback;
  }
}
