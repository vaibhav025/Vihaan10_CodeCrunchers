import type { Lang } from './i18n'

/**
 * PLACEHOLDER QUESTION BANK. The backend only stores multiple-choice quests, so the other
 * question types live here until the API has a `type` field. Answers here are checked on the
 * device and earn coins, not server XP.
 */
type T = Record<Lang, string>
export type LocalQ =
  | { id: string; type: 'tf'; statement: T; answer: boolean; why: T }
  | { id: string; type: 'match'; prompt: T; pairs: [T, T][]; why: T }
  | { id: string; type: 'order'; prompt: T; steps: T[]; why: T }
  | { id: string; type: 'slider'; prompt: T; min: number; max: number; step: number; answer: number; tolerance: number; unit: string; why: T }
  | { id: string; type: 'spot'; prompt: T; lines: T[]; wrong: number; why: T }
  | { id: string; type: 'plan'; prompt: T; a: number; b: number; age: number; why: T }

const t = (en: string, hi: string, mr: string): T => ({ en, hi, mr })

export const BANK: LocalQ[] = [
  { id: 'tf1', type: 'tf', statement: t('Tier I money is locked until age 60.', 'टियर I का पैसा 60 की उम्र तक बंद रहता है।', 'टियर I चे पैसे 60 व्या वर्षापर्यंत बंद असतात.'), answer: true,
    why: t('Tier I is the pension account, with limited early withdrawals.', 'टियर I पेंशन खाता है, समय से पहले निकासी सीमित है।', 'टियर I हे पेन्शन खाते आहे, लवकर पैसे काढणे मर्यादित आहे.') },
  { id: 'tf2', type: 'tf', statement: t('Section 80CCD(1B) gives an extra ₹50,000 deduction.', 'धारा 80CCD(1B) में ₹50,000 की अतिरिक्त कटौती मिलती है।', 'कलम 80CCD(1B) मध्ये ₹50,000 ची अतिरिक्त वजावट मिळते.'), answer: true,
    why: t('It sits on top of the ₹1.5 lakh 80C limit.', 'यह ₹1.5 लाख की 80C सीमा के ऊपर है।', 'ही ₹1.5 लाखांच्या 80C मर्यादेच्या वर आहे.') },
  { id: 'tf3', type: 'tf', statement: t('Tier II contributions carry the same tax benefits as Tier I.', 'टियर II योगदान पर टियर I जैसे कर लाभ मिलते हैं।', 'टियर II योगदानावर टियर I सारखे कर लाभ मिळतात.'), answer: false,
    why: t('Tier II is a flexible savings account without those deductions.', 'टियर II बिना कटौती वाला लचीला बचत खाता है।', 'टियर II हे वजावटीशिवाय लवचिक बचत खाते आहे.') },
  { id: 'm1', type: 'match', prompt: t('Match each term to its meaning.', 'हर शब्द को उसके अर्थ से मिलाएँ।', 'प्रत्येक शब्द त्याच्या अर्थाशी जुळवा.'),
    pairs: [[t('PFRDA', 'PFRDA', 'PFRDA'), t('Regulates NPS', 'NPS को नियंत्रित करता है', 'NPS चे नियमन करते')],
      [t('Annuity', 'वार्षिकी', 'वार्षिकी'), t('Monthly pension income', 'मासिक पेंशन आय', 'मासिक पेन्शन उत्पन्न')],
      [t('Corpus', 'कोष', 'निधी'), t('Total saved at 60', '60 पर कुल जमा', '60 व्या वर्षी एकूण जमा')]],
    why: t('These three words cover most of what an NPS statement says.', 'ये तीन शब्द NPS विवरण की ज़्यादातर बातें बताते हैं।', 'हे तीन शब्द NPS विवरणातील बहुतेक गोष्टी सांगतात.') },
  { id: 'o1', type: 'order', prompt: t('Put the steps to open NPS in order.', 'NPS खोलने के चरण क्रम से लगाएँ।', 'NPS उघडण्याच्या पायऱ्या क्रमाने लावा.'),
    steps: [t('Complete KYC with Aadhaar or PAN', 'आधार या PAN से KYC पूरा करें', 'आधार किंवा PAN ने KYC पूर्ण करा'), t('Choose a pension fund and plan', 'पेंशन फंड और योजना चुनें', 'पेन्शन फंड आणि योजना निवडा'), t('Make the first contribution', 'पहला योगदान करें', 'पहिले योगदान करा'), t('Receive your PRAN', 'अपना PRAN प्राप्त करें', 'तुमचा PRAN मिळवा')],
    why: t('KYC first, then choices, then money; the PRAN confirms the account.', 'पहले KYC, फिर चुनाव, फिर पैसा; PRAN खाते की पुष्टि करता है।', 'आधी KYC, मग निवड, मग पैसे; PRAN खात्याची खात्री देतो.') },
  { id: 's1', type: 'slider', prompt: t('You earn ₹40,000 a month. What is the 10% NPS target?', 'आप ₹40,000 महीना कमाते हैं। 10% NPS लक्ष्य कितना है?', 'तुम्ही महिन्याला ₹40,000 कमावता. 10% NPS लक्ष्य किती?'),
    min: 0, max: 10000, step: 500, answer: 4000, tolerance: 0, unit: '₹', why: t('10% of ₹40,000 is ₹4,000 a month.', '₹40,000 का 10% ₹4,000 महीना है।', '₹40,000 चे 10% म्हणजे ₹4,000 महिना.') },
  { id: 's2', type: 'slider', prompt: t('Up to what % of salary can you deduct under 80CCD(1)?', '80CCD(1) में वेतन के कितने % तक कटौती मिलती है?', '80CCD(1) अंतर्गत पगाराच्या किती % पर्यंत वजावट मिळते?'),
    min: 0, max: 30, step: 1, answer: 10, tolerance: 0, unit: '%', why: t('Up to 10% of salary, inside the ₹1.5 lakh 80C limit.', 'वेतन का 10% तक, ₹1.5 लाख की 80C सीमा में।', 'पगाराच्या 10% पर्यंत, ₹1.5 लाखांच्या 80C मर्यादेत.') },
  { id: 'sp1', type: 'spot', prompt: t('Ravi explains NPS. Tap the line that is wrong.', 'रवि NPS समझाते हैं। गलत पंक्ति चुनें।', 'रवी NPS समजावतो. चुकीची ओळ निवडा.'),
    lines: [t('"PFRDA regulates NPS."', '"PFRDA, NPS को नियंत्रित करता है।"', '"PFRDA NPS चे नियमन करते."'), t('"I can withdraw all of Tier I next year."', '"मैं अगले साल पूरा टियर I निकाल सकता हूँ।"', '"मी पुढच्या वर्षी संपूर्ण टियर I काढू शकतो."'), t('"Part of the corpus buys an annuity at 60."', '"60 पर कोष का एक हिस्सा वार्षिकी खरीदता है।"', '"60 व्या वर्षी निधीचा काही भाग वार्षिकी घेतो."')], wrong: 1,
    why: t('Tier I is locked until 60, apart from limited partial withdrawals.', 'सीमित आंशिक निकासी को छोड़कर टियर I 60 तक बंद रहता है।', 'मर्यादित अंशतः काढणे वगळता टियर I 60 पर्यंत बंद असते.') },
  { id: 'p1', type: 'plan', prompt: t('Which plan gives Future You more at 60?', 'किस योजना से 60 पर भविष्य के आप को ज़्यादा मिलेगा?', 'कोणत्या योजनेने 60 व्या वर्षी भविष्यातील तुम्हाला जास्त मिळेल?'),
    a: 2000, b: 3000, age: 30, why: t('Same years, more each month: the bigger contribution compounds further.', 'उतने ही साल, हर महीने ज़्यादा: बड़ा योगदान ज़्यादा बढ़ता है।', 'तितकीच वर्षे, दर महिन्याला जास्त: मोठे योगदान जास्त वाढते.') },
]

/** Which bank questions a node mixes in, rotating so concepts come back in new forms. */
export function bankFor(nodeIndex: number, count: number): LocalQ[] {
  // different types in each lesson: a stride across the bank
  return Array.from({ length: count }, (_, i) => BANK[(nodeIndex * 3 + i * 4) % BANK.length])
}
