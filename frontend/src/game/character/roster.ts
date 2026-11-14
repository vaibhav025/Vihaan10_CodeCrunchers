import type { Lang } from '../../lib/i18n'
import type { Progress } from '../../lib/session'

export type Slot = 'hat' | 'glasses' | 'outfit' | 'held' | 'trail' | 'dance' | 'sidekick'
export type Look = Record<Slot, string>
export const DEFAULT_LOOK: Look = { hat: 'none', glasses: 'round', outfit: 'kurta', held: 'chai', trail: 'none', dance: 'bounce', sidekick: 'gullak' }
type T = [string, string, string]
export interface Item { id: string; slot: Slot; name: T; hint?: T; test?: (p: Progress) => boolean }
const stars = (p: Progress) => Object.entries(p.nodes).filter(([k]) => k.startsWith('w1-')).reduce((a, [, v]) => a + v, 0)
const done = (n: number) => (p: Progress) => !!p.nodes[`w1-${n}`]
const ach = (id: string) => (p: Progress) => p.achievements.includes(id)

/** Cosmetics and sidekicks. Items without a test are owned from the start. Cosmetics never affect gameplay. */
export const ITEMS: Item[] = [
  { id: 'none', slot: 'hat', name: ['No hat', 'बिना टोपी', 'टोपीशिवाय'] },
  { id: 'cap', slot: 'hat', name: ['Walking cap', 'सैर की टोपी', 'फिरायची टोपी'], hint: ['Clear stage 3', 'चरण 3 पूरा करें', 'टप्पा 3 पूर्ण करा'], test: done(3) },
  { id: 'pagdi', slot: 'hat', name: ['Festive pagdi', 'उत्सव की पगड़ी', 'सणाचा फेटा'], hint: ['Earn 15 stars', '15 सितारे पाएँ', '15 तारे मिळवा'], test: p => stars(p) >= 15 },
  { id: 'beanie', slot: 'hat', name: ['Winter beanie', 'ऊनी टोपी', 'लोकरी टोपी'], hint: ['Clear World 1', 'दुनिया 1 पूरी करें', 'विश्व 1 पूर्ण करा'], test: ach('worldOne') },
  { id: 'kurta', slot: 'outfit', name: ['Forest kurta', 'हरा कुर्ता', 'हिरवा कुर्ता'] },
  { id: 'nehru', slot: 'outfit', name: ['Nehru jacket', 'नेहरू जैकेट', 'नेहरू जॅकेट'], hint: ['Finish a run without a hit', 'बिना टकराए दौड़ पूरी करें', 'धक्का न लागता धाव पूर्ण करा'], test: ach('cleanRun') },
  { id: 'track', slot: 'outfit', name: ['Morning-walk tracksuit', 'सुबह की सैर का ट्रैकसूट', 'सकाळच्या फेरीचा ट्रॅकसूट'], hint: ['Collect 60 coins in one stage', 'एक चरण में 60 सिक्के जुटाएँ', 'एका टप्प्यात 60 नाणी गोळा करा'], test: ach('coinHoarder') },
  { id: 'round', slot: 'glasses', name: ['Round glasses', 'गोल चश्मा', 'गोल चष्मा'] },
  { id: 'shades', slot: 'glasses', name: ['Retirement shades', 'रिटायरमेंट चश्मा', 'निवृत्तीचा गॉगल'], hint: ['Open the stage 5 chest', 'चरण 5 का संदूक खोलें', 'टप्पा 5 ची पेटी उघडा'], test: done(5) },
  { id: 'chai', slot: 'held', name: ['Cutting chai', 'कटिंग चाय', 'कटिंग चहा'] },
  { id: 'ledger', slot: 'held', name: ['Passbook', 'पासबुक', 'पासबुक'], hint: ['Clear stage 6', 'चरण 6 पूरा करें', 'टप्पा 6 पूर्ण करा'], test: done(6) },
  { id: 'none', slot: 'trail', name: ['No trail', 'कोई निशान नहीं', 'माग नाही'] },
  { id: 'coins', slot: 'trail', name: ['Coin trail', 'सिक्कों का निशान', 'नाण्यांचा माग'], hint: ['Earn 24 stars', '24 सितारे पाएँ', '24 तारे मिळवा'], test: p => stars(p) >= 24 },
  { id: 'bounce', slot: 'dance', name: ['Happy bounce', 'ख़ुशी की उछाल', 'आनंदाची उडी'] },
  { id: 'spin', slot: 'dance', name: ['Bhangra spin', 'भांगड़ा घुमाव', 'भांगडा गिरकी'], hint: ['Three stars on the Stress Test', 'तनाव परीक्षा पर तीन सितारे', 'ताण चाचणीत तीन तारे'], test: ach('stormProof') },
  { id: 'gullak', slot: 'sidekick', name: ['Gullak', 'गुल्लक', 'गुल्लक'] },
  { id: 'kachua', slot: 'sidekick', name: ['Kachua', 'कछुआ', 'कासव'], hint: ['Clear stage 7', 'चरण 7 पूरा करें', 'टप्पा 7 पूर्ण करा'], test: done(7) },
  { id: 'dadi', slot: 'sidekick', name: ['Dadi-ji', 'दादी जी', 'आजी'], hint: ['Clear stage 9', 'चरण 9 पूरा करें', 'टप्पा 9 पूर्ण करा'], test: done(9) },
  { id: 'crow', slot: 'sidekick', name: ['Jugaad Crow', 'जुगाड़ू कौआ', 'जुगाडू कावळा'], hint: ['Clear stage 2', 'चरण 2 पूरा करें', 'टप्पा 2 पूर्ण करा'], test: done(2) },
]
/** Three dry one-liners per sidekick. */
export const LINES: Record<string, T[]> = {
  gullak: [['Feed me. I am on a strict diet of coins.', 'मुझे खिलाओ। मैं सिर्फ़ सिक्कों की डाइट पर हूँ।', 'मला खाऊ घाला. मी फक्त नाण्यांच्या डाएटवर आहे.'], ['Break me only in an emergency. I mean it.', 'मुझे सिर्फ़ आपात में तोड़ना। सच में।', 'मला फक्त आणीबाणीत फोडा. खरंच.'], ['Your chai budget called. It wants a raise.', 'आपके चाय बजट का फ़ोन था। उसे बढ़ोतरी चाहिए।', 'तुमच्या चहाच्या बजेटचा फोन होता. त्याला वाढ हवी.']],
  kachua: [['Slow is fine. Stopping is the problem.', 'धीमा ठीक है। रुकना दिक़्क़त है।', 'हळू चालेल. थांबणे हीच अडचण.'], ['I started at 25. Look at me now. Still walking.', 'मैंने 25 में शुरू किया। अब देखो। अब भी चल रहा हूँ।', 'मी 25 व्या वर्षी सुरू केले. आता पहा. अजून चालतोय.'], ['Compounding is just patience with maths.', 'चक्रवृद्धि बस गणित वाला धैर्य है।', 'चक्रवाढ म्हणजे गणितासह संयम.']],
  dadi: [['In my day, we saved first and spent what was left.', 'हमारे ज़माने में पहले बचाते, फिर बचा हुआ खर्च करते थे।', 'आमच्या काळी आधी बचत, मग उरलेला खर्च.'], ['Beta, an emergency fund is not a suggestion.', 'बेटा, आपात कोष कोई सुझाव नहीं है।', 'बाळा, आपत्कालीन निधी ही सूचना नाही.'], ['Eat something. Then check your tax saving.', 'कुछ खा लो। फिर अपनी कर बचत देखो।', 'काहीतरी खा. मग कर बचत तपासा.']],
  crow: [['Guaranteed 24% returns? Caw. That is a scam.', 'पक्का 24% रिटर्न? काँव। यह ठगी है।', 'खात्रीशीर 24% परतावा? काव. हा घोटाळा आहे.'], ['I can smell a hidden fee from three lanes away.', 'छिपा शुल्क मैं तीन गली दूर से सूँघ लेता हूँ।', 'लपलेले शुल्क मला तीन गल्ल्यांवरून वास येते.'], ['Never share an OTP. Not even with a charming crow.', 'OTP कभी न बताएँ। किसी प्यारे कौए को भी नहीं।', 'OTP कधीही सांगू नका. गोड कावळ्यालाही नाही.']],
}
const UI: Record<string, T> = {
  title: ['Wardrobe and Squad', 'अलमारी और साथी', 'कपाट आणि सोबती'], equip: ['Equip', 'पहनें', 'घाला'], on: ['Equipped', 'पहना हुआ', 'घातलेले'], locked: ['Locked', 'बंद', 'बंद'], tryStates: ['Try a pose', 'मुद्रा आज़माएँ', 'मुद्रा करून पहा'],
  hat: ['Hats', 'टोपियाँ', 'टोप्या'], outfit: ['Outfits', 'पोशाक', 'पोशाख'], glasses: ['Glasses', 'चश्मे', 'चष्मे'], held: ['In hand', 'हाथ में', 'हातात'], trail: ['Trails', 'निशान', 'माग'], dance: ['Victory dance', 'जीत का नाच', 'विजयनृत्य'], sidekick: ['Squad', 'साथी', 'सोबती'],
  note: ['Looks only. Nothing here changes gameplay.', 'सिर्फ़ रूप। इससे खेल नहीं बदलता।', 'फक्त रूप. याने खेळ बदलत नाही.'], goal: ['Goal', 'लक्ष्य', 'ध्येय'], reward: ['Up to +{n} coins', '+{n} सिक्कों तक', '+{n} नाण्यांपर्यंत'], back: ['Back to the map', 'नक्शे पर वापस', 'नकाशावर परत'],
}
const IDX: Record<Lang, number> = { en: 0, hi: 1, mr: 2 }
export const tx = (t: T, lang: Lang) => t[IDX[lang]]
export const rt = (k: string, lang: Lang, n?: number) => UI[k][IDX[lang]].replace('{n}', String(n ?? ''))
const GKEY = 'pq.grants'
const grants = (): string[] => { try { return JSON.parse(localStorage.getItem(GKEY) ?? '[]') } catch { return [] } }
/** Collectibles from chests and boxes (slot:id). */
export const grant = (key: string) => { try { localStorage.setItem(GKEY, JSON.stringify([...new Set([...grants(), key])])) } catch { /* storage off */ } }
export const itemOf = (key: string) => { const [slot, id] = key.split(':'); return ITEMS.find(i => i.slot === slot && i.id === id) }
export const owned = (it: Item, p: Progress) => !it.test || grants().includes(`${it.slot}:${it.id}`) || it.test(p)

// TODO: move the equipped look to the player's profile once the backend has a field for it.
const KEY = 'pq.look'
export const getLook = (): Look => { try { return { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULT_LOOK } }
export const saveLook = (l: Look) => localStorage.setItem(KEY, JSON.stringify(l))
