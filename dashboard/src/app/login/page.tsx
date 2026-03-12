/**
 * Login Page
 */

import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Digital Store</h1>
          <p className="text-slate-400 mt-2">Admin Dashboard</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
