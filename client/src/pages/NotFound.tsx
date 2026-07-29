import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400">
        Back home
      </Link>
    </div>
  );
}
