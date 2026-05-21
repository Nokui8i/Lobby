import { createFileRoute } from "@tanstack/react-router";
import { Send, Paperclip, Smile, Search, Phone, Video, MoreHorizontal, Check, CheckCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "הצ׳אטים שלי — LOBBY" }] }),
});

type Msg = { id: number; from: "me" | "them"; text: string; time: string; read?: boolean };

const conversations = [
  { id: 1, name: "נועה לוי", last: "מעולה, אני זמינה גם מחר ב-18:00", time: "12:42", unread: 2, online: true, prop: "דירת 4 חדרים, תל אביב" },
  { id: 2, name: "אבי כהן", last: "נשלח לך את כתובת הבית בעוד רגע", time: "11:08", unread: 0, online: false, prop: "בית פרטי, הרצליה" },
  { id: 3, name: "מאי גרין", last: "תודה רבה על הביקור!", time: "אתמול", unread: 0, online: true, prop: "דירת 3 חד׳, רמת גן" },
  { id: 4, name: "דניאל אור", last: "המחיר עדיין רלוונטי?", time: "אתמול", unread: 1, online: false, prop: "פנטהאוז, פלורנטין" },
  { id: 5, name: "תמר רז", last: "אשמח לקבוע פגישה השבוע", time: "ב׳", unread: 0, online: false, prop: "סטודיו, ירושלים" },
];

const initialMessages: Msg[] = [
  { id: 1, from: "them", text: "היי! ראיתי שאתה מתעניין בדירה. שמחה להפנות אותך לכל פרט נוסף 🙂", time: "12:30" },
  { id: 2, from: "me", text: "היי נועה, תודה! האם הדירה זמינה לכניסה בעוד חודשיים?", time: "12:35", read: true },
  { id: 3, from: "them", text: "כן, בהחלט. אפשר אפילו לתאם חופפות אם תרצה.", time: "12:38" },
  { id: 4, from: "me", text: "מעולה. מתי אפשר לבוא לראות אותה?", time: "12:40", read: true },
  { id: 5, from: "them", text: "מעולה, אני זמינה גם מחר ב-18:00", time: "12:42" },
];

function ChatPage() {
  const [active, setActive] = useState(1);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const current = conversations.find((c) => c.id === active)!;

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), from: "me", text: draft, time: "עכשיו", read: false }]);
    setDraft("");
  };

  return (
    <div className="h-full mx-auto max-w-[1400px] px-4 py-4">
      <div className="bubble-card shadow-bubble h-full flex overflow-hidden" style={{ borderRadius: 28 }}>
        {/* Inbox */}
        <aside className="w-[340px] flex-shrink-0 flex flex-col border-l border-graphite/5 bg-secondary/30">
          <div className="p-4 flex-shrink-0">
            <h2 className="text-xl font-black text-graphite mb-3">תיבת הודעות</h2>
            <div className="h-11 px-4 rounded-full bg-white shadow-float flex items-center gap-2">
              <Search className="h-4 w-4 text-graphite/50" />
              <input className="flex-1 bg-transparent outline-none text-sm" placeholder="חיפוש שיחות" />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`w-full text-right p-3 rounded-2xl transition flex gap-3 ${
                  active === c.id ? "bg-white shadow-float" : "hover:bg-white/60"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1FD6F8] to-[#00A8CC] shadow-puffy grid place-items-center text-white font-bold">
                    {c.name[0]}
                  </div>
                  {c.online && <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-graphite truncate">{c.name}</span>
                    <span className="text-[11px] text-graphite/50">{c.time}</span>
                  </div>
                  <div className="text-xs text-brand/80 truncate">{c.prop}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-sm text-graphite/60 truncate">{c.last}</span>
                    {c.unread > 0 && (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold grid place-items-center">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* header */}
          <div className="h-20 flex-shrink-0 px-6 flex items-center justify-between border-b border-graphite/5 bg-white/60 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1FD6F8] to-[#00A8CC] shadow-puffy grid place-items-center text-white font-bold">{current.name[0]}</div>
              <div>
                <div className="font-bold text-graphite">{current.name}</div>
                <div className="text-xs text-graphite/60">{current.online ? "מחובר/ת עכשיו" : "פעיל/ה לאחרונה"} · {current.prop}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn><Phone className="h-4 w-4" /></IconBtn>
              <IconBtn><Video className="h-4 w-4" /></IconBtn>
              <IconBtn><MoreHorizontal className="h-4 w-4" /></IconBtn>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-3 bg-mesh/30">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-4 py-3 text-sm leading-relaxed shadow-float ${
                    m.from === "me"
                      ? "btn-puffy rounded-[22px_22px_6px_22px]"
                      : "bg-white text-graphite rounded-[22px_22px_22px_6px]"
                  }`}
                >
                  <p>{m.text}</p>
                  <div className={`mt-1 text-[10px] flex items-center gap-1 justify-end ${m.from === "me" ? "text-white/80" : "text-graphite/40"}`}>
                    {m.time}
                    {m.from === "me" && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* composer */}
          <div className="flex-shrink-0 p-4 border-t border-graphite/5 bg-white/70 backdrop-blur">
            <div className="bubble-card flex items-center gap-2 p-2 pl-3" style={{ borderRadius: 999 }}>
              <IconBtn><Smile className="h-4 w-4" /></IconBtn>
              <IconBtn><Paperclip className="h-4 w-4" /></IconBtn>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 bg-transparent outline-none text-graphite placeholder:text-graphite/40 px-2"
                placeholder="כתוב הודעה..."
              />
              <button onClick={send} className="btn-puffy h-11 w-11 rounded-full grid place-items-center flex-shrink-0">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-10 w-10 rounded-full bg-white shadow-float text-graphite/70 hover:text-brand grid place-items-center transition">
      {children}
    </button>
  );
}