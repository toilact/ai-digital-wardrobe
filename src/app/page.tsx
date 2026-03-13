import Header from "@/components/Header";


export default function Home() {
  return (
    <main>
      <Header />
      <div className="wrap">
        {/* Hero Section */}
        <section className="text-center py-20">
          <h1 className="text-5xl font-bold grad-text mb-4">
            Chào mừng đến với AI Digital Wardrobe
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Tủ đồ thông minh giúp bạn quản lý và gợi ý trang phục một cách dễ dàng
          </p>
          <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-8 max-w-4xl mx-auto shadow-xl">
            <h2 className="text-3xl font-semibold text-white/90 mb-6">Công dụng của AI Digital Wardrobe</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              AI Digital Wardrobe là ứng dụng giúp bạn số hóa tủ đồ cá nhân, sử dụng trí tuệ nhân tạo để gợi ý trang phục phù hợp với sự kiện và phong cách mà bạn đưa ra. Ứng dụng tích hợp công nghệ AI tiên tiến để phân tích hình ảnh và đưa ra các đề xuất cá nhân hóa.
            </p>
          </div>
        </section>

        {/* Hướng dẫn sử dụng */}
        <section className="py-20 mt-15">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Hướng dẫn sử dụng</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Bước 1 */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Đăng ký tài khoản</h3>
              <p className="text-gray-300">
                Tạo tài khoản của bạn để bắt đầu sử dụng AI Digital Wardrobe. Bạn có thể đăng ký bằng email hoặc tài khoản Google.
              </p>
              {/* Placeholder cho ảnh */}
              <div className="mt-4 h-32 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
                <span className="text-gray-400">Ảnh minh họa bước 1</span>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Upload tủ đồ</h3>
              <p className="text-gray-300">
                Tải lên hình ảnh các món đồ trong tủ đồ của bạn. AI sẽ tự động phân loại và gán nhãn cho từng món đồ.
              </p>
              <div className="mt-4 h-32 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
                <span className="text-gray-400">Ảnh minh họa bước 2</span>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Nhận gợi ý trang phục</h3>
              <p className="text-gray-300">
                Dựa trên thời tiết và sở thích của bạn, AI sẽ gợi ý các bộ trang phục phù hợp từ tủ đồ của bạn.
              </p>
              <div className="mt-4 h-32 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
                <span className="text-gray-400">Ảnh minh họa bước 3</span>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center py-20">
          <h2 className="text-3xl font-bold text-white mb-6">Bắt đầu ngay hôm nay!</h2>
          <p className="text-gray-300 mb-8">
            Đăng ký tài khoản miễn phí và trải nghiệm sức mạnh của AI trong việc quản lý tủ đồ.
          </p>
          <div className="space-x-4">
            <a href="/auth/register" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Đăng ký ngay
            </a>
            <a href="/auth/login" className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-8 py-3 rounded-lg font-semibold transition-colors backdrop-blur-sm">
              Đăng nhập
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}


