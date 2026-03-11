// hooks/useUserDisplayName.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // your initialized supabase-js client

type Profile = { display_name?: string; full_name?: string; username?: string };

export function useUserDisplayName() {
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (isMounted) { setName("Guest"); setLoading(false); }
        return;
      }

      // Fetch profile row; adjust table/columns to match your schema
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, full_name, username")
        .eq("id", user.id)
        .single<Profile>();

      const fallback =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Driver";

      if (isMounted) {
        if (error) {
          setName(fallback);
        } else {
          setName(data?.display_name || data?.full_name || data?.username || fallback);
        }
        setLoading(false);
      }
    }

    load();

    // Optional: live update when profile row changes
    const channel = supabase
      .channel("profile-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: any) => {
          const row = payload.new as Profile;
          if (row && isMounted) {
            setName(row.display_name || row.full_name || row.username || "Driver");
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { name, loading };
}
