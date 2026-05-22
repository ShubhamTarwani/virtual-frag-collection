"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 ml-2 rounded-full text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
      title="Sign Out"
    >
      Sign Out
    </button>
  );
}
