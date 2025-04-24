import { Button } from "@/components/ui/button";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      provider.addScope('profile');
      provider.addScope('email');
      
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Please sign in</h2>
      <p className="text-muted-foreground mb-4">
        You need to be signed in to access the rehearsal scheduler.
      </p>
      <Button 
        onClick={handleSignIn}
        disabled={loading}
        className="px-6 py-3"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in with Google"
        )}
      </Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default Auth;
