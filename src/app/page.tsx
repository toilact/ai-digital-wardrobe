import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-xl p-6 space-y-4 text-center">
        <h1 className="text-2xl font-semibold">AI Digital Wardrobe</h1>
        <p className="text-sm text-gray-600">Bắt đầu bằng đăng nhập hoặc đăng ký</p>

        <div className="flex gap-3 justify-center">
          <Link className="px-4 py-2 rounded bg-black text-white" href="/auth/login">
            Đăng nhập
          </Link>
          <Link className="px-4 py-2 rounded border" href="/auth/register">
            Đăng ký
          </Link>
        </div>
      </div>
    </main>
  );
}
