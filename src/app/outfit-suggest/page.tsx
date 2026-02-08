import WardrobeStylistChat from "@/components/WardrobeStylistChat";

export default function OutfitSuggestPage() {
  return (
    <main className="min-h-screen bg-[#FFFDD0] p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6">
        <h1 className="text-3xl font-semibold mb-2">🤖 Gợi ý outfit</h1>
        <p className="text-gray-600 mb-6">
          Chọn mục đích đi đâu + phong cách, hệ thống sẽ dựa theo thời tiết để gợi ý outfit phù hợp.
        </p>

        <WardrobeStylistChat />
      </div>
    </main>
  );
}
