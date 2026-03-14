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
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Tủ đồ thông minh giúp bạn quản lý quần áo dễ dàng hơn, số hóa tủ đồ cá nhân
            và nhận gợi ý trang phục phù hợp bằng trí tuệ nhân tạo.
          </p>

          <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-8 max-w-4xl mx-auto shadow-xl text-left">
            <h2 className="text-3xl font-semibold text-white mb-5 text-center">
              Công dụng của AI Digital Wardrobe
            </h2>

            <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
              <p>
                <span className="text-white font-semibold">AI Digital Wardrobe</span> là
                ứng dụng hỗ trợ bạn <span className="text-white/90">quản lý tủ đồ cá nhân một cách hiện đại và tiện lợi</span>.
                Thay vì phải nhớ mình có gì trong tủ, bạn có thể lưu trữ toàn bộ quần áo lên hệ thống để theo dõi dễ dàng hơn.
              </p>

              <p>
                Ứng dụng sử dụng <span className="text-white/90">trí tuệ nhân tạo</span> để
                phân tích hình ảnh, nhận diện và phân loại từng món đồ. Nhờ đó, bạn có thể nhanh chóng tìm kiếm,
                sắp xếp và quản lý trang phục theo nhu cầu sử dụng.
              </p>

              <p>
                Không chỉ dừng lại ở việc lưu trữ, AI Digital Wardrobe còn giúp bạn
                <span className="text-white/90"> gợi ý trang phục phù hợp</span> dựa trên hoàn cảnh,
                phong cách mong muốn hoặc điều kiện thời tiết, giúp việc chọn đồ mỗi ngày trở nên nhanh hơn và dễ dàng hơn.
              </p>
            </div>
          </div>
        </section>

        {/* Hướng dẫn sử dụng */}
        <section className="py-12">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Hướng dẫn sử dụng
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Bước 1 */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Đăng ký tài khoản</h3>
              <p className="text-gray-300">
                Tạo tài khoản để bắt đầu sử dụng AI Digital Wardrobe. Bạn có thể đăng ký
                bằng email hoặc tài khoản Google.
              </p>
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
                Tải lên hình ảnh các món đồ trong tủ đồ của bạn. AI sẽ tự động phân loại
                và gán nhãn cho từng món đồ.
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
                Dựa trên thời tiết và sở thích của bạn, AI sẽ gợi ý các bộ trang phục phù hợp
                từ chính tủ đồ của bạn.
              </p>
              <div className="mt-4 h-32 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
                <span className="text-gray-400">Ảnh minh họa bước 3</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}