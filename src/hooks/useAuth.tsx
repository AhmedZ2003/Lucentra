import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/integrations/FireBase/firebase"; // Firebase auth import
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/FireBase/firebase"; // Firestore import
import { onAuthStateChanged, User } from "firebase/auth"; // Firebase auth state change

type Profile = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  role?: string; // Assuming role is stored in Firestore
};

const PROFILE_COLLECTION = "users"; // Collection for storing user profiles in Firestore

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const navigate = useNavigate();

  // ---- Auth state ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ---- Load profile data from Firestore ----
  const loadProfile = async (currentUser: User) => {
    setProfileLoading(true);
    const profileRef = doc(db, PROFILE_COLLECTION, currentUser.uid);
    const profileDoc = await getDoc(profileRef);

    if (profileDoc.exists()) {
      setProfile(profileDoc.data() as Profile);
    } else {
      // Fallback profile if no data exists
      const fallback: Profile = {
        id: currentUser.uid,
        display_name: currentUser.displayName || currentUser.email?.split("@")[0] || "Guest",
        full_name: currentUser.displayName || "Guest",
        role: "guest", // Default role, can be updated later
      };
      setProfile(fallback);
    }
    setProfileLoading(false);
  };

  // ---- Nice display name with fallbacks ----
  const profileName = useMemo(() => {
    if (!user && !profile) return "Guest";
    return (
      profile?.display_name ||
      profile?.full_name ||
      profile?.username ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Guest"
    );
  }, [user, profile]);

  const loading = authLoading || profileLoading;

  const signOut = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return { user, loading, signOut, profile, profileName };
};
