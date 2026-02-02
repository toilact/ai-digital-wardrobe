import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-8 rounded-xl border w-[360px] text-center space-y-4">
        <h1 className="text-2xl font-semibold">AI Digital Wardrobe</h1>
        <p className="text-sm text-gray-500">
          Đăng nhập để bắt đầu quản lý outfit và nhận gợi ý từ AI
        </p>
        <GoogleLoginButton />
      </div>
    </main>
  );
}
