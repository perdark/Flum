import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Digital Store</h1>
          <p className="text-muted-foreground mt-2">Admin Dashboard</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
