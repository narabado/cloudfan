export default function Projects() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-[#1a3a5c] mb-8">🏸 プロジェクト一覧</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "札幌北高校", title: "全国大会遠征費", goal: 500000, current: 320000, days: 18, region: "札幌" },
            { name: "旭川商業高校", title: "新ユニフォーム購入", goal: 200000, current: 145000, days: 25, region: "旭川" },
            { name: "函館水産高校", title: "合宿費用支援", goal: 300000, current: 87000, days: 42, region: "函館" },
          ].map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-lg transition">
              <div className="bg-[#1a3a5c] h-32 flex items-center justify-center text-4xl">🏸</div>
              <div className="p-4">
                <div className="text-xs text-[#d4af37] font-bold mb-1">{p.region}</div>
                <div className="text-xs text-gray-400 mb-1">{p.name}</div>
                <div className="font-bold text-[#1a3a5c] mb-3">{p.title}</div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="bg-[#d4af37] h-2 rounded-full" style={{width:`${Math.round(p.current/p.goal*100)}%`}}/>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{Math.round(p.current/p.goal*100)}% 達成</span>
                  <span>残り{p.days}日</span>
                </div>
                <div className="text-[#1a3a5c] font-black">¥{p.current.toLocaleString()}</div>
                <button className="w-full mt-3 bg-[#1a3a5c] text-white py-2 rounded-xl font-bold hover:opacity-90">
                  支援する
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
