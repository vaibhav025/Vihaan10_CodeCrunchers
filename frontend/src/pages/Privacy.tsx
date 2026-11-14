import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Lock, Shield } from '../components/ui/icons'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { api } from '../lib/api'

/** Plain-language account of how personal data is protected. Public, so it can be read before signing up. */
interface Copy {
  title: string; intro: string; points: [string, string][]; limitsTitle: string; limits: string[]
  controlTitle: string; controlNote: string; download: string; remove: string; confirm: string; failed: string
  signedOut: string; start: string; back: string
}

const EN: Copy = {
  title: 'Your data, kept safe',
  intro: 'SixtyFy asks about your money so that it can help you. This page says exactly what happens to those details, in plain words.',
  points: [
    ['Encrypted before it is saved', 'Your name, email, age, income range, tracker entries and contribution amounts are encrypted (AES-256-GCM) on our server before they reach the database. Anyone who got hold of the database would see only scrambled text.'],
    ['Your password is never stored', 'We keep only a one-way scrypt hash of it, so nobody, including us, can read your password. Repeated wrong logins are slowed down.'],
    ['Nothing financial stays in your browser', 'You stay signed in through a secure cookie that scripts on the page cannot read. Your money details are held in memory only while the page is open. Only game progress and settings, such as lessons, habits, language and theme, are saved on this device.'],
    ['The AI never sees your numbers', 'The coach works out every figure on our server. AI help is off until you switch it on in your profile. Even then, the AI model receives placeholders in place of your figures, and any amounts or ID numbers you type are masked first. Requests then pass through Prune, a security gateway that blocks prompt-injection attempts and enforces spending limits before anything reaches the AI provider.'],
    ['Private from other users', 'Each account can read only its own data. The leaderboard is opt-in and shows a nickname you choose, never your real name.'],
    ['No ads, no trackers, no selling', 'The site carries no advertising and no analytics trackers. We do not sell or share your data.'],
  ],
  limitsTitle: 'What to keep in mind',
  limits: [
    'SixtyFy is a student hackathon project. It has not been independently audited or certified.',
    'The encryption key is held on our server. This protects your data from a database leak and from other users, but the service itself has to decrypt your data to show it to you.',
    'Never enter a password, PIN, OTP or full account number for your bank or NPS account. SixtyFy never asks for them.',
  ],
  controlTitle: 'You stay in control',
  controlNote: 'Download everything we hold about you, or delete your account and all its data, at any time.',
  download: 'Download my data', remove: 'Delete my account',
  confirm: 'Delete your account and all its data? This cannot be undone.',
  failed: 'That did not work. Please try again.',
  signedOut: 'Sign in to download or delete your data.', start: 'Create an account', back: 'Back',
}

const HI: Copy = {
  title: 'आपका डेटा, सुरक्षित',
  intro: 'SixtyFy आपकी मदद करने के लिए आपके पैसों की जानकारी माँगता है। यह पेज सरल शब्दों में बताता है कि उस जानकारी के साथ क्या होता है।',
  points: [
    ['सेव होने से पहले एन्क्रिप्ट', 'आपका नाम, ईमेल, उम्र, आय सीमा, ट्रैकर की जानकारी और योगदान राशि डेटाबेस में जाने से पहले हमारे सर्वर पर एन्क्रिप्ट (AES-256-GCM) की जाती है। डेटाबेस किसी के हाथ लग भी जाए तो उसे केवल अपठनीय टेक्स्ट दिखेगा।'],
    ['आपका पासवर्ड कभी सेव नहीं होता', 'हम केवल उसका एकतरफ़ा scrypt हैश रखते हैं, इसलिए कोई भी, हम भी, आपका पासवर्ड नहीं पढ़ सकते। बार-बार ग़लत लॉगिन को धीमा कर दिया जाता है।'],
    ['ब्राउज़र में कोई वित्तीय जानकारी नहीं रहती', 'आप एक सुरक्षित कुकी से लॉग इन रहते हैं जिसे पेज की स्क्रिप्ट नहीं पढ़ सकतीं। आपके पैसों की जानकारी केवल पेज खुला रहने तक मेमोरी में रहती है। इस डिवाइस पर केवल गेम की प्रगति और सेटिंग, जैसे पाठ, आदतें, भाषा और थीम, सेव होती हैं।'],
    ['AI आपके आँकड़े कभी नहीं देखता', 'कोच हर आँकड़ा हमारे सर्वर पर निकालता है। AI सहायता तब तक बंद रहती है जब तक आप उसे प्रोफ़ाइल में चालू न करें। चालू होने पर भी AI मॉडल को आपके आँकड़ों की जगह प्लेसहोल्डर मिलते हैं, और आपकी लिखी राशि या पहचान संख्या पहले छिपा दी जाती है। इसके बाद अनुरोध Prune नाम के सुरक्षा गेटवे से गुज़रते हैं, जो AI प्रदाता तक पहुँचने से पहले प्रॉम्प्ट-इंजेक्शन की कोशिशों को रोकता है और खर्च की सीमा लागू करता है।'],
    ['दूसरे उपयोगकर्ताओं से निजी', 'हर खाता केवल अपना डेटा पढ़ सकता है। लीडरबोर्ड वैकल्पिक है और आपका चुना हुआ उपनाम दिखाता है, असली नाम कभी नहीं।'],
    ['न विज्ञापन, न ट्रैकर, न बिक्री', 'साइट पर कोई विज्ञापन या एनालिटिक्स ट्रैकर नहीं है। हम आपका डेटा न बेचते हैं, न साझा करते हैं।'],
  ],
  limitsTitle: 'ध्यान रखने योग्य बातें',
  limits: [
    'SixtyFy एक छात्र हैकाथॉन प्रोजेक्ट है। इसका स्वतंत्र ऑडिट या प्रमाणन नहीं हुआ है।',
    'एन्क्रिप्शन कुंजी हमारे सर्वर पर रहती है। यह आपके डेटा को डेटाबेस लीक और दूसरे उपयोगकर्ताओं से बचाती है, पर आपको डेटा दिखाने के लिए सेवा को उसे डिक्रिप्ट करना पड़ता है।',
    'अपने बैंक या NPS खाते का पासवर्ड, PIN, OTP या पूरा खाता नंबर कभी न डालें। SixtyFy इन्हें कभी नहीं माँगता।',
  ],
  controlTitle: 'नियंत्रण आपके हाथ में',
  controlNote: 'हमारे पास मौजूद अपनी पूरी जानकारी डाउनलोड करें, या अपना खाता और उसका सारा डेटा कभी भी हटाएँ।',
  download: 'मेरा डेटा डाउनलोड करें', remove: 'मेरा खाता हटाएँ',
  confirm: 'क्या आप अपना खाता और उसका सारा डेटा हटाना चाहते हैं? इसे वापस नहीं लाया जा सकता।',
  failed: 'यह नहीं हो सका। कृपया फिर कोशिश करें।',
  signedOut: 'डेटा डाउनलोड करने या हटाने के लिए साइन इन करें।', start: 'खाता बनाएँ', back: 'वापस',
}

export default function Privacy() {
  const { lang } = useI18n()
  const { user, reset } = useSession()
  const nav = useNavigate()
  const [error, setError] = useState(false)
  const c = lang === 'hi' ? HI : EN

  const download = async () => {
    setError(false)
    try {
      const data = await api.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url; a.download = 'pensionquest-my-data.json'; a.click()
      URL.revokeObjectURL(url)
    } catch { setError(true) }
  }
  const remove = async () => {
    if (!window.confirm(c.confirm)) return
    setError(false)
    try {
      const res = await api.deleteAccount()
      if (!res.ok) throw new Error()
      reset(); nav('/')
    } catch { setError(true) }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pb-16 pt-6 sm:px-8">
      <button type="button" className="link" onClick={() => nav(-1)}>← {c.back}</button>
      <h1 className="mt-4 flex items-center gap-3 text-3xl text-ink sm:text-4xl"><Shield size={28} strokeWidth={1.5} aria-hidden />{c.title}</h1>
      <p className="mt-3 text-lg text-soft">{c.intro}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {c.points.map(([head, body]) => (
          <li key={head} className="rounded-md border border-line bg-card p-5">
            <h2 className="flex items-start gap-2 font-medium text-ink"><Lock size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-forest" aria-hidden />{head}</h2>
            <p className="mt-2 text-soft">{body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-md border border-line bg-card p-5">
        <h2 className="font-medium text-ink">{c.controlTitle}</h2>
        <p className="mt-2 text-soft">{c.controlNote}</p>
        {user ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={download} className="pressable inline-flex min-h-[44px] items-center rounded-md border border-forest px-4 font-medium text-forest hover:bg-haze">{c.download}</button>
            <button type="button" onClick={remove} className="pressable inline-flex min-h-[44px] items-center rounded-md border border-line px-4 font-medium text-rust hover:border-rust">{c.remove}</button>
          </div>
        ) : (
          <p className="mt-3 text-soft">{c.signedOut} <Link to="/start" className="underline underline-offset-2 hover:text-ink">{c.start}</Link></p>
        )}
        {error && <p role="alert" className="mt-3 text-rust">{c.failed}</p>}
      </section>

      <section className="mt-8">
        <h2 className="font-medium text-ink">{c.limitsTitle}</h2>
        <ul className="mt-3 space-y-2">
          {c.limits.map(line => (
            <li key={line} className="flex items-start gap-2 text-soft"><Check size={16} strokeWidth={1.5} className="mt-1 shrink-0" aria-hidden />{line}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
