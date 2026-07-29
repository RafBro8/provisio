import { useAuth } from "../context/AuthContext";

export function Account() {
  const { user } = useAuth();
  // ProtectedRoute guarantees this only renders when authenticated.
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Your account</h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="inline font-medium">Name: </dt>
          <dd className="inline">{user.name}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Email: </dt>
          <dd className="inline">{user.email}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Role: </dt>
          <dd className="inline capitalize">{user.role}</dd>
        </div>
      </dl>
    </div>
  );
}
