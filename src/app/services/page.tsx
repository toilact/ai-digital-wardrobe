import Header from "@/components/Header";
import Link from "next/link";

export default function Services() {
    return (
        <main>
            <Header />
            <div className="wrap">
                <section className="text-center py-10   ">
                    <h1 className="text-5xl font-bold grad-text mb-4">
                        Gói Dịch Vụ
                    </h1>
                    <p className="text-xl text-gray-300 mb-12">
                        Chọn gói dịch vụ phù hợp nhất với nhu cầu quản lý tủ đồ của bạn
                    </p>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Tài khoản thường */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-lg hover:border-white/20 transition-all rounded-3xl p-8 flex flex-col text-left shadow-lg">
                            <h2 className="text-2xl font-bold text-white mb-2">Tài khoản Thường</h2>
                            <div className="text-4xl font-bold text-white mb-6">Miễn phí</div>
                            <p className="text-gray-300 mb-8 flex-1">
                                Trải nghiệm các tính năng cơ bản của AI Digital Wardrobe để bắt đầu hành trình quản lý thời trang cá nhân.
                            </p>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start text-gray-300">
                                    <svg className="w-6 h-6 text-green-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu trữ tối đa 15 món đồ
                                </li>
                                <li className="flex items-start text-gray-300">
                                    <svg className="w-6 h-6 text-green-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Phân loại đồ bằng AI (cơ bản)
                                </li>
                                <li className="flex items-start text-gray-300">
                                    <svg className="w-6 h-6 text-green-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Số lượt gợi ý trang phục: 1 lần/ ngày
                                </li>
                            </ul>

                            <Link href="/auth/register" className="w-full text-center bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                                Đăng ký ngay
                            </Link>
                        </div>

                        {/* Tài khoản VIP */}
                        <div className="relative bg-gradient-to-b from-blue-900/40 to-pink-900/20 border border-blue-500/30 backdrop-blur-lg hover:border-blue-400/50 transition-all rounded-3xl p-8 flex flex-col text-left shadow-[0_0_40px_rgba(59,130,246,0.15)] transform md:-translate-y-4">
                            <div className="absolute top-0 right-8 transform -translate-y-1/2">
                                <span className="bg-gradient-to-r from-blue-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                    Phổ biến nhất
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Tài khoản VIP</h2>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold grad-text">25.000đ</span>
                                <span className="text-gray-400 ml-2">/ tháng</span>
                            </div>
                            <p className="text-gray-300 mb-8 flex-1">
                                Mở khóa sức mạnh tối đa của AI với không gian mở rộng và gợi ý chuyên sâu.
                            </p>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start text-white/90">
                                    <svg className="w-6 h-6 text-pink-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu trữ lên tới 30 món đồ
                                </li>
                                <li className="flex items-start text-white/90">
                                    <svg className="w-6 h-6 text-pink-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Phân tích phong cách nâng cao
                                </li>
                                <li className="flex items-start text-white/90">
                                    <svg className="w-6 h-6 text-pink-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Gợi ý trang phục ấn tượng với stylist được nâng cấp
                                </li>
                                <li className="flex items-start text-white/90">
                                    <svg className="w-6 h-6 text-pink-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Số lượt gợi ý trang phục: 5 lần/ ngày
                                </li>
                            </ul>

                            <button className="w-full text-center bg-gradient-to-r from-blue-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-pink-600 transition-colors shadow-lg hover:shadow-xl">
                                Nâng cấp VIP
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
