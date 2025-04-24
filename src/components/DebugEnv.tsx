export function DebugEnv() {
    return (
      <div className="fixed bottom-4 left-4 bg-white p-4 shadow-lg z-50">
        <h3 className="font-bold mb-2">Environment Variables</h3>
        <pre className="text-xs">
          {JSON.stringify({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          }, null, 2)}
        </pre>
      </div>
    )
  }