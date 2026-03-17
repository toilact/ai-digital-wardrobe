import Link from "next/link";
import Header from "@/components/Header";
import StartButton from "@/components/StartButton";

const pillars = [
  {
    title: "Cá nhân hóa thực sự",
    description:
      "Mỗi gợi ý được xây dựng từ chính tủ đồ, bối cảnh sử dụng và phong cách riêng của bạn, thay vì những lời khuyên thời trang chung chung.",
  },
  {
    title: "AI có ích trong đời sống",
    description:
      "Chúng tôi ứng dụng AI để giải quyết việc chọn đồ hằng ngày nhanh hơn, rõ ràng hơn và bớt lãng phí hơn.",
  },
  {
    title: "Thiết kế lấy trải nghiệm làm trung tâm",
    description:
      "Mọi tính năng đều hướng tới một hành trình mượt mà: lưu tủ đồ, hiểu món đồ và nhận đề xuất có thể dùng ngay.",
  },
];

const capabilities = [
  {
    eyebrow: "01",
    title: "Số hóa tủ đồ cá nhân",
    description:
      "Biến tủ đồ vật lý thành một hệ thống trực quan, có cấu trúc và dễ quản lý trên nền tảng số.",
  },
  {
    eyebrow: "02",
    title: "Hiểu ngữ cảnh mặc đẹp",
    description:
      "Gợi ý outfit dựa trên dịp sử dụng, thời tiết, màu sắc, phong cách mong muốn và các món đồ bạn đang có.",
  },
  {
    eyebrow: "03",
    title: "Tối ưu giá trị từng món đồ",
    description:
      "Giúp người dùng nhìn lại tủ đồ hiện tại, phối mới từ đồ cũ và ra quyết định mua sắm thông minh hơn.",
  },
];

const teamAreas = [
  {
    label: "Product & Experience",
    title: "Thiết kế một trải nghiệm thời trang rõ ràng, hiện đại và đáng tin cậy",
    description:
      "Đội ngũ sản phẩm tập trung vào trải nghiệm người dùng, hành vi sử dụng thực tế và cách biến những thao tác phức tạp thành hành trình đơn giản.",
    accent: "from-sky-500/25 via-cyan-400/10 to-transparent",
  },
  {
    label: "AI & Intelligence",
    title: "Xây dựng hệ thống hiểu hình ảnh, ngữ cảnh và nhu cầu phối đồ",
    description:
      "Chúng tôi phát triển các luồng AI có khả năng phân tích tủ đồ, hiểu yêu cầu người dùng và tạo ra gợi ý mang tính ứng dụng cao.",
    accent: "from-fuchsia-500/25 via-pink-400/10 to-transparent",
  },
  {
    label: "Platform & Reliability",
    title: "Đảm bảo nền tảng vận hành ổn định, an toàn và sẵn sàng mở rộng",
    description:
      "Phía sau giao diện là hạ tầng được thiết kế để xử lý dữ liệu, tối ưu hóa trải nghiệm và đảm bảo tính bảo mật luôn đáng tin cậy.",
    accent: "from-emerald-500/25 via-lime-400/10 to-transparent",
  },
];

const principles = [
  "Thiết kế tính năng dựa trên nhu cầu thật của người dùng, không chạy theo công nghệ vì xu hướng.",
  "Ưu tiên lời gợi ý rõ ràng, hữu ích cùng với hình ảnh minh họa trực quan để có thể giúp người dùng hình dung dễ dàng hơn outfit mình sẽ mặc.",
  "Kết hợp thời trang, dữ liệu và AI theo cách dễ hiểu, gần gũi và thực tế.",
];

export default function About() {
  return (
    <main className="pb-20">
      <Header />

      <div className="wrap">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-x-0 top-8 -z-10 mx-auto h-72 w-[82%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.22),rgba(236,72,153,0.12),transparent_70%)] blur-3xl" />

          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.75)]" />
                AI-powered fashion platform
              </div>

              <h1 className="max-w-4xl text-3xl font-bold leading-tight md:text-4xl">
                <span className="grad-text text-6xl">Chúng tôi xây dựng AI Digital Wardrobe </span>
                <span className=" text-white/92 text-3xl ">
                  để việc quản lý tủ đồ và chọn trang phục trở nên thông minh, tinh gọn và truyền cảm hứng hơn mỗi ngày.
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                AI Digital Wardrobe là nơi giúp bạn hiểu rõ tủ đồ của mình,
                đưa ra quyết định nhanh hơn và tận dụng tốt hơn những gì bạn đã sở hữu.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/services"
                  className="rounded-2xl bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition hover:scale-[1.02]"
                >
                  Khám phá dịch vụ
                </Link>
                <StartButton
                  className="rounded-2xl border border-white/12 bg-white/5 px-6 py-3 font-semibold text-white/88 backdrop-blur-md transition hover:bg-white/10"
                >
                  Trải nghiệm tủ đồ thông minh
                </StartButton>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.22em] text-white/45">Tầm nhìn</div>
                    <div className="mt-3 text-2xl font-semibold text-white/92">
                      Trở thành trợ lý thời trang cá nhân đáng tin cậy cho cuộc sống hiện đại.
                    </div>
                  </div>

                </div>
                <p className="mt-5 text-sm leading-7 text-white/65">
                  Chúng tôi theo đuổi một trải nghiệm nơi AI không thay thế gu thẩm mỹ của bạn, mà giúp bạn khai mở nó một cách nhanh hơn và chính xác hơn.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-white/5 to-transparent p-5 backdrop-blur-xl">
                  <div className="text-sm text-white/50">Điểm mạnh cốt lõi</div>
                  <div className="mt-2 text-2xl font-semibold text-white/92">AI hiểu tủ đồ thật</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Phân tích hình ảnh, nhận diện món đồ và tạo đề xuất từ dữ liệu bạn đang có.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/18 via-white/5 to-transparent p-5 backdrop-blur-xl">
                  <div className="text-sm text-white/50">Giá trị mang lại</div>
                  <div className="mt-2 text-2xl font-semibold text-white/92">Mặc đẹp với ít thời gian hơn</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Trợ lý AI giúp bạn phối đồ nhanh chóng và tự tin hơn trong mọi dịp chỉ với 2 phút.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(0,0,0,.36)] backdrop-blur-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-white/45">Sứ mệnh</div>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-white/92 md:text-4xl">
                  Đưa việc quản lý tủ đồ từ cảm tính sang một trải nghiệm có <span className="grad-text">cấu trúc, thông minh và đầy cảm hứng.</span>
                </h2>
              </div>

              <div className="space-y-5 text-base leading-8 text-white/68">
                <p>
                  Chúng tôi tin rằng một tủ đồ tốt không chỉ là tập hợp của nhiều món quần áo, mà là khả năng hiểu rõ mình có gì,
                  mặc gì cho đúng lúc và tận dụng tối đa những lựa chọn sẵn có.
                </p>
                <p>
                  AI Digital Wardrobe ra đời để kết nối ba yếu tố thường bị tách rời: dữ liệu trang phục hiện có, bối cảnh sử dụng thực tế
                  và gu thẩm mỹ cá nhân. Khi ba yếu tố này được đặt cùng nhau, việc chọn outfit trở nên nhanh hơn và chính xác hơn bao giơ hết.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Đội ngũ phát triển --- */}
        <section className="py-16 md:py-28">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <div className="text-base uppercase tracking-[0.22em] text-indigo-400 font-semibold mb-2">Đội ngũ phát triển</div>
            <h2 className="text-4xl md:text-5xl font-bold text-white/95 leading-tight">
              Những người xây dựng <br /> <span className="grad-text">AI Digital Wardrobe</span>
            </h2>
            <p className="mt-6 text-xl text-white/60 leading-relaxed">
              Một tập thể nhỏ nhưng mang hoài bão lớn: thay đổi cách mọi người tương tác với thời trang hàng ngày.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto px-4">
            {/* Thành viên 1 */}
            <div className="group rounded-[36px] bg-gradient-to-br from-white/[0.06] to-transparent border border-white/5 hover:border-white/15 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">
                <div className="w-32 h-32 shrink-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent p-1">
                  <div className="w-full h-full rounded-full bg-[#151c2f] border border-white/10 overflow-hidden relative group-hover:border-indigo-400/30 transition-colors duration-500 shadow-inner flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 mix-blend-overlay"></div>
                    <img src="/dacanh.png" alt="" />
                  </div>
                </div>

                <div className="text-center sm:text-left pt-2">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-2xl font-bold text-white/95 group-hover:text-indigo-200 transition-colors">Đắc Anh</h3>
                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 uppercase tracking-wider">
                      Developer
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/60">
                    Sinh viên năm 2 đam mê công nghệ ứng dụng thực tế. Đóng vai trò xây dựng hệ thống nền tảng vững chắc và kết nối thông suốt với trí tuệ nhân tạo.
                  </p>
                </div>
              </div>
            </div>

            {/* Thành viên 2 */}
            <div className="group rounded-[36px] bg-gradient-to-br from-white/[0.06] to-transparent border border-white/5 hover:border-white/15 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">
                <div className="w-32 h-32 shrink-0 rounded-full bg-gradient-to-br from-pink-500/10 to-transparent p-1">
                  <div className="w-full h-full rounded-full bg-[#151c2f] border border-white/10 overflow-hidden relative group-hover:border-pink-400/30 transition-colors duration-500 shadow-inner flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-emerald-500/20 mix-blend-overlay"></div>
                    <img src="/chithanh.png" alt="" />
                  </div>
                </div>

                <div className="text-center sm:text-left pt-2">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-2xl font-bold text-white/95 group-hover:text-pink-200 transition-colors">Chí Thành</h3>
                    <div className="inline-block px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-medium text-pink-400 uppercase tracking-wider">
                      Developer
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/60">
                    Sinh viên năm 2 đam mê công nghệ ứng dụng thực tế. Mang đến những giải pháp tối ưu hệ thống, cấu trúc lại luồng dữ liệu ứng dụng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20">
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,.16),rgba(236,72,153,.12),rgba(34,197,94,.12))] p-8 shadow-[0_26px_90px_rgba(0,0,0,.4)] backdrop-blur-xl md:p-10">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-white/45">Liên hệ</div>
                <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-white/95 md:text-4xl">
                  Nếu bạn quan tâm đến tương lai của thời trang cá nhân hóa bằng AI, chúng tôi rất sẵn lòng kết nối.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/66">
                  AI Digital Wardrobe luôn chào đón và ghi nhận những ý kiến đóng góp về sản phẩm, trải nghiệm người dùng và những ý tưởng có thể làm cho việc mặc đẹp trở nên thông minh hơn.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-white/78">
                    Email: katoxz1002@gmail.com
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-white/78">
                    Địa điểm: Hồ Chí Minh, Việt Nam
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/services"
                  className="rounded-2xl border border-white/12 bg-white/8 px-6 py-3 font-semibold text-white/90 transition hover:bg-white/12"
                >
                  Xem dịch vụ
                </Link>
                <StartButton
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  Bắt đầu ngay
                </StartButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
