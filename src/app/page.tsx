export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヒーローセクション */}
      <div className="bg-[#1a3a5c] text-white text-center py-20 px-4">
        <div className="inline-block bg-[#d4af37] text-[#1a3a5c] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest">
          SPORTS SUPPORT HOKKAIDO
        </div>
        <h1 className="text-4xl font-black mb-4">
          北海道のバドミントン部を<br />みんなで支援しよう
        </h1>
        <p className="text-lg opacity-80 mb-8">
          遠征費・大会参加費・用具費をクラウドファンディングで支援
        </p>
        <a href="/projects" className="bg-[#d4af37] text-[#1a3a5c] font-black px-8 py-4 rounded-full text-lg hover:opacity-90">
          プロジェクト一覧を見る →
        </a>
      </div>

      {/* 統計 */}
      <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 p-8">
        <div className="bg-white rounded-2xl p-6 text-center shadow">
          <div className="text-3xl font-black text-[#1a3a5c]">¥620,000</div>
          <div className="text-gray-500 text-sm mt-1">総支援金額</div>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow">
          <div className="text-3xl font-black text-[#1a3a5c]">48人</div>
          <div className="text-gray-500 text-sm mt-1">支援者数</div>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow">
          <div className="text-3xl font-black text-[#1a3a5c]">3件</div>
          <div className="text-gray-500 text-sm mt-1">進行中プロジェクト</div>
        </div>
      </div>

      {/* プロジェクトカード */}
      <div className="max-w-4xl mx-auto px-8 pb-16">
        <h2 className="text-2xl font-black text-[#1a3a5c] mb-6">🏸 注目のプロジェクト</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "札幌北高校", title: "全国大会遠征費", goal: 500000, current: 320000, days: 18 },
            { name: "旭川商業高校", title: "新ユニフォーム購入", goal: 200000, current: 145000, days: 25 },
            { name: "函館水産高校", title: "合宿費用支援", goal: 300000, current: 87000, days: 42 },
          ].map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-lg transition">
              <div className="bg-[#1a3a5c] h-32 flex items-center justify-center text-4xl">🏸</div>
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-1">{p.name}</div>
                <div className="font-bold text-[#1a3a5c] mb-3">{p.title}</div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-[#d4af37] h-2 rounded-full"
                    style={{ width: `${Math.round(p.current/p.goal*100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{Math.round(p.current/p.goal*100)}% 達成</span>
                  <span>残り{p.days}日</span>
                </div>
                <div className="text-[#1a3a5c] font-black mt-1">¥{p.current.toLocaleString()}</div>
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
