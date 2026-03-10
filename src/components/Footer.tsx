export default function Footer() {
    return (
        <footer className="bg-gray-800 text-white mt-auto py-6">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 ml-25">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">AI Digital Wardrobe</h3>
                        <p className="text-gray-400">
                            Nền tảng trợ lý thời trang thông minh
                        </p>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Liên kết</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <a href="/dashboard" className="hover:text-white transition">
                                    Bảng điều khiển
                                </a>
                            </li>
                            <li>
                                <a href="/wardrobe" className="hover:text-white transition">
                                    Tủ quần áo
                                </a>
                            </li>
                            <li>
                                <a href="/outfit-suggest" className="hover:text-white transition">
                                    Gợi ý trang phục
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4">Theo dõi chúng tôi</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <a href="https://www.facebook.com/acanhpham.2025/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                    Anh Phạm
                                </a>
                            </li>
                            <li>
                                <a href="https://www.facebook.com/katodeptraihathay" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                    Chí Thành
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
                <p>
                    &copy; {new Date().getFullYear()} AI Digital Wardrobe.
                </p>
            </div>

        </footer >
    );
}
