import Link from "next/link";
import Header from "@/components/Header";

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
      "Phía sau giao diện là hạ tầng được thiết kế để xử lý dữ liệu, đồng bộ trải nghiệm và giữ cho hệ thống luôn đáng tin cậy.",
    accent: "from-emerald-500/25 via-lime-400/10 to-transparent",
  },
];

const principles = [
  "Thiết kế tính năng dựa trên nhu cầu thật của người dùng, không chạy theo công nghệ vì xu hướng.",
  "Ưu tiên lời gợi ý rõ ràng, hữu ích và có thể áp dụng ngay trong đời sống hằng ngày.",
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

              <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
                <span className="grad-text">Chúng tôi xây dựng AI Digital Wardrobe</span>
                <span className="block mt-3 text-white/92">
                  để việc quản lý tủ đồ và chọn trang phục trở nên thông minh, tinh gọn và truyền cảm hứng hơn mỗi ngày.
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                AI Digital Wardrobe là nơi thời trang gặp công nghệ theo cách thực tế nhất: giúp bạn hiểu rõ tủ đồ của mình,
                đưa ra quyết định nhanh hơn và tận dụng tốt hơn những gì bạn đã sở hữu.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/services"
                  className="rounded-2xl bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition hover:scale-[1.02]"
                >
                  Khám phá dịch vụ
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-white/12 bg-white/5 px-6 py-3 font-semibold text-white/88 backdrop-blur-md transition hover:bg-white/10"
                >
                  Trải nghiệm tủ đồ thông minh
                </Link>
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                    <div className="text-xs text-white/45">Focus</div>
                    <div className="text-lg font-semibold text-white/90">Style x AI</div>
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
                  <div className="mt-2 text-2xl font-semibold text-white/92">Mặc đẹp với ít ma sát hơn</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    Ít thời gian phân vân hơn, nhiều quyết định tự tin hơn trong những dịp mặc hằng ngày.
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
                  Đưa việc quản lý tủ đồ từ cảm tính sang một trải nghiệm có cấu trúc, thông minh và đầy cảm hứng.
                </h2>
              </div>

              <div className="space-y-5 text-base leading-8 text-white/68">
                <p>
                  Chúng tôi tin rằng một tủ đồ tốt không chỉ là tập hợp của nhiều món quần áo, mà là khả năng hiểu rõ mình có gì,
                  mặc gì cho đúng lúc và tận dụng tối đa những lựa chọn sẵn có.
                </p>
                <p>
                  AI Digital Wardrobe ra đời để kết nối ba yếu tố thường bị tách rời: dữ liệu về món đồ, bối cảnh sử dụng thực tế
                  và gu thẩm mỹ cá nhân. Khi ba yếu tố này được đặt cùng nhau, việc chọn outfit trở nên nhanh hơn, chính xác hơn
                  và bền vững hơn.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="mb-10 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.22em] text-white/45">Năng lực cốt lõi</div>
            <h2 className="mt-3 text-4xl font-bold text-white/95">Điều làm nên AI Digital Wardrobe</h2>
            <p className="mt-4 text-lg leading-8 text-white/62">
              Chúng tôi không xây dựng một ứng dụng thời trang chỉ để trông đẹp. Chúng tôi xây dựng một công cụ hữu ích đủ để bạn muốn quay lại sử dụng mỗi ngày.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="group rounded-[28px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="text-sm font-semibold tracking-[0.18em] text-white/40">{item.eyebrow}</div>
                <h3 className="mt-4 text-2xl font-semibold text-white/92">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-white/62">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.22em] text-white/45">Cách chúng tôi làm việc</div>
              <h2 className="mt-3 text-4xl font-bold text-white/95">Một đội ngũ liên ngành, cùng tập trung vào một mục tiêu rõ ràng</h2>
              <p className="mt-5 text-lg leading-8 text-white/64">
                Chúng tôi kết hợp tư duy sản phẩm, công nghệ AI và kỹ thuật nền tảng để tạo ra trải nghiệm có chiều sâu,
                thay vì chỉ thêm AI như một lớp trang trí.
              </p>

              <div className="mt-8 space-y-4">
                {principles.map((principle) => (
                  <div
                    key={principle}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
                  >
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400" />
                    <p className="text-white/70">{principle}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {teamAreas.map((area) => (
                <article
                  key={area.label}
                  className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${area.accent} p-6 backdrop-blur-xl`}
                >
                  <div className="text-sm uppercase tracking-[0.18em] text-white/48">{area.label}</div>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-white/92">{area.title}</h3>
                  <p className="mt-4 text-base leading-8 text-white/64">{area.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-[26px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,.24)]"
              >
                <h3 className="text-xl font-semibold text-white/92">{pillar.title}</h3>
                <p className="mt-4 leading-8 text-white/62">{pillar.description}</p>
              </div>
            ))}
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
                  AI Digital Wardrobe luôn chào đón những cuộc trò chuyện về sản phẩm, trải nghiệm người dùng và những ý tưởng có thể làm cho việc mặc đẹp trở nên thông minh hơn.
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
                <Link
                  href="/auth/login"
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  Bắt đầu ngay
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
