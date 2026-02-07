export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-slate-400">Page not found</p>
      <a
        href="/"
        className="mt-6 px-6 py-3 rounded bg-cyan-500 hover:bg-cyan-600"
      >
        Go Home
      </a>
    </div>
  );
}
