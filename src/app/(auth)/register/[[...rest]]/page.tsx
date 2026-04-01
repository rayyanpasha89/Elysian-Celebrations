import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export default function RegisterPage() {
  return (
    <div className="flex w-full flex-col">
      <p className="font-accent mb-10 text-[10px] uppercase tracking-[0.28em] text-slate">
        Create account
      </p>
      <SignUp
        path="/register"
        routing="path"
        appearance={clerkAuthAppearance}
      />
    </div>
  );
}
