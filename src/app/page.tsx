import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen pb-20 overflow-x-hidden">
      <Header />

      <div className="wrap space-y-24">
        {/* 1. Hero Section */}
        <section className="relative pt-13 pb-12 lg:pb-24">
          <div className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 mx-auto h-72 w-[80%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15),rgba(236,72,153,0.1),transparent_70%)] blur-3xl" />

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-[4.5rem] font-bold mb-6 leading-[1.15]">
                <span className="grad-text">Chào mừng đến với  AI DIGITAL WARDROBE</span>
              </h1>
              <p className="text-xl text-white/75 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-10">
                Trợ lý thời trang cá nhân của bạn. Chỉ với vài thao tác, tủ đồ vật lý sẽ được số hoá hoàn toàn, giúp bạn quản lý và chọn trang phục thông minh, nhẹ nhàng hơn mỗi ngày.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Link
                  href="/auth/login"
                  className="inline-flex rounded-2xl bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500 px-8 py-4 font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition hover:scale-[1.03] text-lg"
                >
                  Bắt đầu ngay
                </Link>
              </div>
            </div>

            {/* Layer Ảnh Hero */}
            <div className="relative aspect-square md:aspect-[4/3] lg:aspect-square w-full max-w-[500px] mx-auto rounded-3xl overflow-hidden group">
              <div className="absolute inset-x-8 inset-y-0 bg-white/5 border border-white/10 rounded-3xl rotate-3 transition-transform duration-500 group-hover:rotate-6"></div>
              <div className="absolute inset-x-4 inset-y-4 bg-white/10 border border-white/10 rounded-3xl -rotate-2 transition-transform duration-500 group-hover:-rotate-3 backdrop-blur-md"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-white/20 rounded-3xl flex items-center justify-center z-10 overflow-hidden shadow-2xl backdrop-blur-xl transition hover:border-white/30">
                <img src="/home-page-image.png" alt="" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Điểm mạnh */}
        <section className="py-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white/95">
              Tất cả những gì bạn cần <br /> <span className="grad-text">để mặc đẹp</span>
            </h2>
            <p className="text-white/60 mt-4 max-w-xl mx-auto text-lg">
              Trải nghiệm thời trang số hóa kết hợp công nghệ AI, giúp thấu hiểu cấu trúc tủ đồ thực tế.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600/30 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <span className="text-indigo-400 text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white/92 mb-4">Số hóa bằng AI</h3>
              <p className="text-white/65 leading-relaxed">
                Chỉ cần chụp ảnh, AI sẽ tự động tách nền, nhận diện và đánh nhãn chính xác từng loại quần áo để lưu trữ có hệ thống.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600/30 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <span className="text-emerald-400 text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-white/92 mb-4">Tủ đồ kỹ thuật số</h3>
              <p className="text-white/65 leading-relaxed">
                Dễ dàng quan sát mọi trang phục mình có ngay trên điện thoại
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-600/30 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <span className="text-pink-400 text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-semibold text-white/92 mb-4">Đề xuất thông minh</h3>
              <p className="text-white/65 leading-relaxed">
                AI Stylist gợi ý outfit phù hợp nhất dựa theo thông tin người dùng và sự kiện người dùng cung cấp.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex rounded-2xl border border-white/15 bg-white/10 px-8 py-3.5 font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            >
              Bắt đầu
            </Link>
          </div>
        </section>

        {/* 3. Ngừng tốn thời gian */}
        <section className="py-8">
          <div className="rounded-[36px] bg-gradient-to-r p-[1px] from-indigo-500/30 via-purple-500/30 to-emerald-500/30 w-full max-w-5xl mx-auto shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>

            <div className="rounded-[35px] bg-[#0a0f1c]/90 backdrop-blur-xl p-8 md:p-12 relative z-10">
              <div className="grid md:grid-cols-[1fr_0.8fr] gap-10 items-center">

                {/* Content */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    Tiết kiệm thời gian
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-8">
                    Ngừng tốn thời gian <br className="hidden md:block" /> vào việc chọn outfit
                  </h2>

                  <div className="space-y-4">
                    <div className="group/item flex bg-white/[0.03] p-5 rounded-2xl border border-white/5 gap-4 items-center transition-colors hover:bg-white/[0.06]">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 relative overflow-hidden text-red-400 transition-transform group-hover/item:scale-110 duration-300">
                        <span className="text-xl">✗</span>
                        <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-white/40 text-sm line-through decoration-white/20">Hơn 30 phút lưỡng lự chọn đồ</div>
                        <div className="text-white font-medium text-lg bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Gợi ý hoàn hảo trong 2 phút ⚡</div>
                      </div>
                    </div>

                    <div className="group/item flex bg-white/[0.03] p-5 rounded-2xl border border-white/5 gap-4 items-center transition-colors hover:bg-white/[0.06]">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 relative overflow-hidden text-red-400 transition-transform group-hover/item:scale-110 duration-300">
                        <span className="text-xl">✗</span>
                        <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-white/40 text-sm line-through decoration-white/20">Mơ hồ không biết mặc lên sẽ thế nào</div>
                        <div className="text-white font-medium text-lg bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Hình ảnh preview trực quan 👀</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-slate-900 shadow-[0_10px_20px_rgba(255,255,255,0.08)] transition-all hover:scale-105 hover:shadow-[0_15px_30px_rgba(255,255,255,0.15)] group/btn"
                    >
                      Bắt đầu ngay
                      <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                    </Link>
                  </div>
                </div>

                {/* Layer Ảnh gọn hơn */}
                <div className="relative aspect-[4/5] w-full max-w-[340px] mx-auto rounded-3xl overflow-hidden group/image perspective-1000">
                  <div className="absolute inset-x-6 inset-y-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-3xl rotate-6 transition-transform duration-700 group-hover/image:rotate-12"></div>
                  <div className="absolute inset-x-3 inset-y-3 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 border border-white/10 rounded-3xl -rotate-3 transition-transform duration-700 group-hover/image:-rotate-6 backdrop-blur-md"></div>

                  <div className="absolute inset-0 bg-[#12182b]/80 border border-white/20 rounded-3xl flex items-center justify-center z-10 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 hover:border-white/40 group-hover/image:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
                    <div className="text-center p-6 relative">
                      <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="text-2xl">✨</span>
                      </div>
                      <span className="text-white/80 tracking-widest text-sm font-semibold block mb-1">AI STYLING</span>
                      <span className="text-white/40 text-xs">Phân tích & Phối đồ</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 4. Hướng dẫn sử dụng */}
        <section className="py-12 pb-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white/95 mb-4">
            Số hóa tủ đồ của bạn <br /><span className="grad-text">chỉ với 3 bước</span>
          </h2>
          <p className="text-white/60 mb-16 max-w-xl mx-auto text-lg">

          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
            {/* Bước 1 */}
            <div className="group text-center">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/50 text-2xl font-bold group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                1
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-3">Đăng ký tài khoản</h3>
              <p className="text-white/50 text-sm md:text-base leading-relaxed mb-6 px-4">
                Tạo tài khoản để bắt đầu sử dụng AI Digital Wardrobe. Bạn có thể đăng ký bằng email hoặc tài khoản Google.
              </p>
              <div className="h-48 rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover:border-white/20 transition-colors">
                <img src="/login-page.png" alt="" />
              </div>
            </div>

            {/* Bước 2 */}
            <div className="group text-center">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/50 text-2xl font-bold group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
                2
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-3">Upload tủ đồ</h3>
              <p className="text-white/50 text-sm md:text-base leading-relaxed mb-6 px-4">
                Tải lên hình ảnh các món đồ trong tủ đồ của bạn. AI sẽ tự động phân loại và gán nhãn cho từng món đồ.
              </p>
              <div className="h-48 rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover:border-white/20 transition-colors">
                <img src="/upload-page.png" alt="" />
              </div>
            </div>

            {/* Bước 3 */}
            <div className="group text-center">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/50 text-2xl font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                3
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-3">Nhận gợi ý trang phục</h3>
              <p className="text-white/50 text-sm md:text-base leading-relaxed mb-6 px-4">
                Dựa trên phong cách, sự kiện mà bạn cung cấp AI sẽ gợi ý các bộ trang phục phù hợp từ chính tủ đồ của bạn.
              </p>
              <div className="h-48 rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover:border-white/20 transition-colors">
                <img src="/stylist-chat-page.png" alt="" />
              </div>
            </div>
          </div>

          <div className="mt-20">
            <Link
              href="/auth/login"
              className="inline-flex rounded-full bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500 px-10 py-5 font-bold text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition hover:scale-[1.03] text-lg"
            >
              Bắt đầu ngay
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}