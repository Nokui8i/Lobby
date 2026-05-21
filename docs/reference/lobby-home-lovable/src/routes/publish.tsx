import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { Check, MapPin, Home, Camera, FileText, Sparkles, Upload } from "lucide-react";

export const Route = createFileRoute("/publish")({
  component: Publish,
  head: () => ({ meta: [{ title: "פרסום מודעה — LOBBY" }] }),
});

const steps = [
  { id: 1, label: "פרטי הנכס", icon: Home },
  { id: 2, label: "מיקום", icon: MapPin },
  { id: 3, label: "תמונות", icon: Camera },
  { id: 4, label: "תיאור ומחיר", icon: FileText },
  { id: 5, label: "סיום", icon: Sparkles },
];

function Publish() {
  const [step, setStep] = useState(1);
  return (
    <div className="mx-auto max-w-[1100px] px-6 pt-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-graphite">פרסם מודעה חדשה</h1>
        <p className="mt-2 text-graphite/60">חמישה צעדים פשוטים, הכל בועתי ונקי</p>
      </div>

      {/* Stepper */}
      <div className="bubble-card p-4 mb-6" style={{ borderRadius: 24 }}>
        <div className="flex items-center justify-between gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`h-12 w-12 rounded-2xl grid place-items-center font-bold transition ${
                    active ? "btn-puffy" : done ? "bg-emerald-500 text-white shadow-puffy" : "bg-secondary text-graphite/50"
                  }`}>
                    {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${active ? "text-brand" : "text-graphite/60"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${step > s.id ? "bg-emerald-400" : "bg-secondary"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bubble-card shadow-bubble p-8" style={{ borderRadius: 28 }}>
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="סוג נכס"><select className={inputCls}><option>דירה</option><option>בית פרטי</option><option>פנטהאוז</option><option>סטודיו</option></select></Field>
            <Field label="מספר חדרים"><input type="number" defaultValue={3} className={inputCls} /></Field>
            <Field label="גודל (מ״ר)"><input type="number" placeholder="למשל 102" className={inputCls} /></Field>
            <Field label="קומה"><input placeholder="3 מתוך 6" className={inputCls} /></Field>
            <Field label="תכונות" full>
              <div className="flex flex-wrap gap-2">
                {["מעלית", "חניה", "ממ\"ד", "מרפסת", "גינה", "מזגן", "מחסן", "ג'קוזי"].map((t) => (
                  <label key={t} className="px-4 py-2 rounded-full bg-secondary cursor-pointer hover:btn-puffy hover:text-white text-sm font-medium transition">
                    <input type="checkbox" className="hidden" />{t}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="עיר"><input placeholder="תל אביב" className={inputCls} /></Field>
            <Field label="שכונה"><input placeholder="הצפון הישן" className={inputCls} /></Field>
            <Field label="רחוב ומספר" full><input placeholder="דיזנגוף 100" className={inputCls} /></Field>
            <div className="md:col-span-2 h-56 rounded-2xl bg-gradient-to-br from-[#E0F7FD] to-[#F0FAFD] grid place-items-center text-graphite/40 font-medium">
              תצוגת מפה תוצג כאן
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div className="border-2 border-dashed border-brand/40 rounded-3xl p-12 text-center bg-secondary/40">
              <div className="h-16 w-16 rounded-2xl btn-puffy grid place-items-center text-white mx-auto"><Upload className="h-7 w-7" /></div>
              <h3 className="mt-4 text-xl font-bold text-graphite">גרור תמונות לכאן</h3>
              <p className="text-graphite/60 text-sm mt-1">JPG / PNG · עד 20 תמונות · גודל מקסימלי 10MB לתמונה</p>
              <button className="mt-5 btn-puffy h-12 px-6 rounded-full font-bold">בחר קבצים</button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="כותרת" full><input placeholder="דירה מדהימה עם נוף פתוח" className={inputCls} /></Field>
            <Field label="תיאור" full><textarea rows={6} placeholder="ספר/י על הנכס..." className={`${inputCls} h-auto py-3 leading-relaxed`} /></Field>
            <Field label="מחיר מבוקש (₪)"><input type="number" placeholder="3,500,000" className={inputCls} /></Field>
            <Field label="ארנונה חודשית"><input type="number" placeholder="450" className={inputCls} /></Field>
          </div>
        )}
        {step === 5 && (
          <div className="text-center py-10">
            <div className="h-24 w-24 rounded-3xl bg-emerald-500 shadow-puffy grid place-items-center mx-auto">
              <Check className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-black text-graphite">הכל מוכן לפרסום! 🎉</h2>
            <p className="text-graphite/60 mt-2">המודעה תעלה לאוויר בתוך מספר דקות לאחר אישור.</p>
            <button className="mt-8 btn-puffy h-14 px-10 rounded-full font-bold text-base">פרסם עכשיו</button>
          </div>
        )}

        {step < 5 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="h-12 px-6 rounded-full bg-white shadow-float font-semibold text-graphite disabled:opacity-50"
              disabled={step === 1}
            >
              חזרה
            </button>
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="btn-puffy h-12 px-8 rounded-full font-bold"
            >
              המשך
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

const inputCls = "h-12 w-full rounded-2xl bg-secondary px-4 outline-none text-graphite placeholder:text-graphite/40 focus:bg-white focus:shadow-float transition";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-sm font-semibold text-graphite mb-2">{label}</label>
      {children}
    </div>
  );
}