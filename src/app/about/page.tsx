import Header from "@/components/Header";

export default function About() {
    return (
        <main className="">
            <Header />
            <div className="wrap">
                {/* Hero Section */}
                <section className="text-center py-20">
                    <h1 className="text-5xl font-bold grad-text mb-4">
                        Về chúng tôi
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Đội ngũ đằng sau AI Digital Wardrobe
                    </p>
                </section>

                {/* Sứ mệnh */}
                <section className="py-20">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-8 max-w-4xl mx-auto shadow-xl">
                        <h2 className="text-3xl font-semibold text-white/90 mb-6 text-center">Sứ mệnh của chúng tôi</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Tại AI Digital Wardrobe, sứ mệnh của chúng tôi là cách mạng hóa cách mọi người quản lý và tương tác với tủ đồ cá nhân. Chúng tôi tin rằng công nghệ AI có thể giúp mọi người tiết kiệm thời gian, giảm lãng phí và thể hiện phong cách cá nhân một cách tốt hơn. Bằng cách kết hợp trí tuệ nhân tạo với hiểu biết sâu sắc về thời trang, chúng tôi tạo ra một nền tảng giúp bạn dễ dàng khám phá và tận dụng tối đa bộ sưu tập quần áo của mình.
                        </p>
                    </div>
                </section>

                {/* Đội ngũ */}
                <section className="py-20">
                    <h2 className="text-4xl font-bold text-white text-center mb-12">Đội ngũ phát triển</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Thành viên 1 */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
                            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white text-3xl font-bold">A</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white/90 mb-2">Nguyễn Văn A</h3>
                            <p className="text-gray-400 mb-4">Frontend Developer</p>
                            <p className="text-gray-300 text-sm">
                                Chuyên gia phát triển giao diện người dùng với niềm đam mê tạo ra trải nghiệm người dùng tuyệt vời.
                            </p>
                        </div>

                        {/* Thành viên 2 */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white text-3xl font-bold">B</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white/90 mb-2">Trần Thị B</h3>
                            <p className="text-gray-400 mb-4">AI Engineer</p>
                            <p className="text-gray-300 text-sm">
                                Chuyên gia trí tuệ nhân tạo, phát triển các thuật toán phân tích hình ảnh và gợi ý trang phục thông minh.
                            </p>
                        </div>

                        {/* Thành viên 3 */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-2xl p-6 text-center shadow-lg hover:-translate-y-1">
                            <div className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white text-3xl font-bold">C</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white/90 mb-2">Lê Văn C</h3>
                            <p className="text-gray-400 mb-4">Backend Developer</p>
                            <p className="text-gray-300 text-sm">
                                Phát triển hệ thống backend mạnh mẽ, đảm bảo an toàn và hiệu suất cao cho ứng dụng.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Liên hệ */}
                <section className="text-center py-20">
                    <h2 className="text-3xl font-bold text-white mb-6">Liên hệ với chúng tôi</h2>
                    <p className="text-gray-300 mb-8">
                        Có câu hỏi hoặc góp ý? Chúng tôi luôn sẵn sàng lắng nghe từ bạn.
                    </p>
                    <div className="space-y-4">
                        <p className="text-gray-300">Email: contact@aidigitalwardrobe.com</p>
                        <p className="text-gray-300">Địa chỉ: Hà Nội, Việt Nam</p>
                    </div>
                </section>
            </div>
        </main>
    );
}