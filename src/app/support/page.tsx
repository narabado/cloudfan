export default function Support() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-black text-[#1a3a5c] mb-6">💛 支援する</h1>
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 block mb-2">金額を選ぶ</label>
          <div className="grid grid-cols-3 gap-2">
            {[1000,3000,5000,10000,30000,50000].map(a => (
              <button key={a} className="border-2 border-[#1a3a5c] text-[#1a3a5c] font-bold py-2 rounded-xl hover:bg-[#1a3a5c] hover:text-white transition">
                ¥{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 block mb-2">お名前</label>
          <input className="w-full border rounded-xl p-3" placeholder="山田 太郎"/>
        </div>
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 block mb-2">応援メッセージ（任意）</label>
          <textarea className="w-full border rounded-xl p-3 h-24" placeholder="頑張ってください！"/>
        </div>
        <button className="w-full bg-[#d4af37] text-[#1a3a5c] font-black py-4 rounded-xl text-lg hover:opacity-90">
          支援する →
        </button>
      </div>
    </main>
  );
}
