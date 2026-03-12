export default function Admin() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-[#1a3a5c] mb-8">⚙️ 管理画面</h1>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { label: "総支援金額", value: "¥620,000" },
            { label: "支援者数", value: "48人" },
            { label: "プロジェクト数", value: "3件" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow">
              <div className="text-3xl font-black text-[#1a3a5c]">{k.value}</div>
              <div className="text-gray-500 text-sm mt-1">{k.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-black text-[#1a3a5c] mb-4">プロジェクト承認</h2>
          <table className="w-full text-sm">
            <thead><tr className="bg-[#1a3a5c] text-[#d4af37]">
              <th className="p-3 text-left">学校名</th>
              <th className="p-3 text-left">タイトル</th>
              <th className="p-3 text-left">状態</th>
              <th className="p-3 text-left">操作</th>
            </tr></thead>
            <tbody>
              {[
                { school: "札幌北高校", title: "全国大会遠征費", status: "審査中" },
                { school: "旭川商業高校", title: "新ユニフォーム", status: "承認済み" },
              ].map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{r.school}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3">
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{r.status}</span>
                  </td>
                  <td className="p-3">
                    <button className="bg-green-500 text-white text-xs px-3 py-1 rounded-full mr-2">承認</button>
                    <button className="bg-red-500 text-white text-xs px-3 py-1 rounded-full">却下</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
