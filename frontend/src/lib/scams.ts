import type { Lang } from './i18n'
type T = Record<Lang, string>
const t = (en: string, hi: string, mr: string): T => ({ en, hi, mr })

/** Scam Shield scenarios, built on common pension-fraud patterns. Three a week, rotating. */
export interface Scam { id: string; channel: 'sms' | 'call' | 'whatsapp' | 'email'; from: string; text: T; scam: boolean; flags: T[]; why: T }

export const SCAMS: Scam[] = [
  { id: 'kyc', channel: 'sms', from: 'VK-NPSKYC', scam: true,
    text: t('Your NPS account will be BLOCKED today. Update KYC now: bit.ly/nps-kyc-upd', 'आपका NPS खाता आज बंद हो जाएगा। अभी KYC अपडेट करें: bit.ly/nps-kyc-upd', 'तुमचे NPS खाते आज बंद होईल. आत्ता KYC अपडेट करा: bit.ly/nps-kyc-upd'),
    flags: [t('Urgent threat: "blocked today"', 'डराने वाली जल्दबाज़ी: "आज बंद"', 'घाईची धमकी: "आज बंद"'), t('Shortened link, not an official site', 'छोटा लिंक, आधिकारिक साइट नहीं', 'लहान लिंक, अधिकृत साइट नाही')],
    why: t('CRA and PFRDA never send short links or threaten to block accounts by SMS. Update KYC only on the official CRA site or app.', 'CRA और PFRDA कभी छोटे लिंक या खाता बंद करने की धमकी SMS से नहीं भेजते। KYC केवल आधिकारिक CRA साइट या ऐप पर अपडेट करें।', 'CRA आणि PFRDA कधीही लहान लिंक किंवा खाते बंद करण्याची धमकी SMS ने पाठवत नाहीत. KYC फक्त अधिकृत CRA साइट किंवा ॲपवर अपडेट करा.') },
  { id: 'otp', channel: 'call', from: '+91 98•• ••• 210', scam: true,
    text: t('"Sir, I am calling from PFRDA. Your pension bonus of ₹48,000 is approved. Please tell me the OTP you just received to release it."', '"सर, मैं PFRDA से बोल रहा हूँ। आपका ₹48,000 पेंशन बोनस मंज़ूर हुआ है। इसे जारी करने के लिए अभी आया OTP बताइए।"', '"सर, मी PFRDA मधून बोलतोय. तुमचा ₹48,000 पेन्शन बोनस मंजूर झाला आहे. तो मिळवण्यासाठी आत्ता आलेला OTP सांगा."'),
    flags: [t('Asks for an OTP', 'OTP माँगता है', 'OTP मागतो'), t('An unexpected "bonus"', 'अचानक "बोनस"', 'अनपेक्षित "बोनस"')],
    why: t('PFRDA is a regulator; it does not call individuals or pay bonuses. Never share an OTP with anyone, for any reason.', 'PFRDA एक नियामक है; यह किसी को फ़ोन नहीं करता और न बोनस देता है। कभी किसी को OTP न बताएँ।', 'PFRDA ही नियामक संस्था आहे; ती कोणाला फोन करत नाही किंवा बोनस देत नाही. OTP कधीही कोणालाही सांगू नका.') },
  { id: 'cra', channel: 'email', from: 'noreply@cra-nsdl.com', scam: false,
    text: t('Your contribution of ₹2,000 has been credited to your Tier I account. View your statement by logging in to the CRA website.', 'आपके टियर I खाते में ₹2,000 का योगदान जमा हुआ है। विवरण देखने के लिए CRA वेबसाइट पर लॉग इन करें।', 'तुमच्या टियर I खात्यात ₹2,000 चे योगदान जमा झाले आहे. विवरण पाहण्यासाठी CRA वेबसाइटवर लॉग इन करा.'),
    flags: [t('No link to click, no request for details', 'कोई लिंक नहीं, कोई जानकारी नहीं माँगी', 'कोणतीही लिंक नाही, माहिती मागितली नाही'), t('Matches a payment you made', 'आपके किए भुगतान से मेल खाता है', 'तुम्ही केलेल्या पेमेंटशी जुळते')],
    why: t('A plain credit confirmation that asks nothing of you is normal. Still, open the CRA site yourself rather than following email links.', 'कुछ न माँगने वाली साधारण जमा-सूचना सामान्य है। फिर भी ईमेल लिंक के बजाय CRA साइट खुद खोलें।', 'काहीही न मागणारी साधी जमा-सूचना सामान्य आहे. तरीही ईमेल लिंकऐवजी CRA साइट स्वतः उघडा.') },
  { id: 'double', channel: 'whatsapp', from: 'NPS Growth Club', scam: true,
    text: t('Join our VIP NPS plan! Guaranteed 24% returns, double your pension in 3 years. Pay ₹5,000 joining fee via UPI to this number.', 'हमारी VIP NPS योजना से जुड़ें! पक्का 24% रिटर्न, 3 साल में पेंशन दोगुनी। इस नंबर पर UPI से ₹5,000 शुल्क भेजें।', 'आमच्या VIP NPS योजनेत सामील व्हा! खात्रीशीर 24% परतावा, 3 वर्षांत पेन्शन दुप्पट. या नंबरवर UPI ने ₹5,000 शुल्क भरा.'),
    flags: [t('"Guaranteed" high returns', '"पक्का" ऊँचा रिटर्न', '"खात्रीशीर" जास्त परतावा'), t('Fee paid to a personal UPI', 'निजी UPI पर शुल्क', 'वैयक्तिक UPI वर शुल्क')],
    why: t('NPS returns are market-linked and never guaranteed. There is no VIP plan, and contributions go only through official channels, never to a person.', 'NPS रिटर्न बाज़ार से जुड़े हैं, कभी पक्के नहीं। कोई VIP योजना नहीं है, और योगदान केवल आधिकारिक माध्यम से जाता है।', 'NPS परतावा बाजाराशी जोडलेला असतो, कधीही खात्रीशीर नसतो. कोणतीही VIP योजना नाही, योगदान फक्त अधिकृत मार्गाने जाते.') },
  { id: 'hr', channel: 'email', from: 'hr@yourcompany.com', scam: false,
    text: t('Corporate NPS enrolment is open this month. Opt in through the payroll portal; the employer contribution starts next salary.', 'इस महीने कॉर्पोरेट NPS नामांकन खुला है। पेरोल पोर्टल से जुड़ें; नियोक्ता योगदान अगले वेतन से शुरू होगा।', 'या महिन्यात कॉर्पोरेट NPS नोंदणी सुरू आहे. पेरोल पोर्टलवरून सामील व्हा; नियोक्ता योगदान पुढच्या पगारापासून सुरू होईल.'),
    flags: [t('From your own company domain', 'आपकी अपनी कंपनी के डोमेन से', 'तुमच्या स्वतःच्या कंपनीच्या डोमेनवरून'), t('Uses your internal payroll portal', 'आंतरिक पेरोल पोर्टल का उपयोग', 'अंतर्गत पेरोल पोर्टल वापरते')],
    why: t('Employers do run Corporate NPS. If unsure, confirm with HR in person before entering details.', 'नियोक्ता कॉर्पोरेट NPS चलाते हैं। संदेह हो तो जानकारी देने से पहले HR से सीधे पूछें।', 'नियोक्ते कॉर्पोरेट NPS चालवतात. शंका असल्यास माहिती देण्यापूर्वी HR कडे थेट खात्री करा.') },
  { id: 'agent', channel: 'call', from: '+91 70•• ••• 455', scam: true,
    text: t('"Your father\'s pension is stuck. Pay a ₹1,999 processing fee and share his PRAN and Aadhaar, I will release it today."', '"आपके पिता की पेंशन अटकी है। ₹1,999 प्रोसेसिंग शुल्क दें और उनका PRAN व आधार बताएँ, मैं आज जारी कर दूँगा।"', '"तुमच्या वडिलांची पेन्शन अडकली आहे. ₹1,999 प्रक्रिया शुल्क भरा आणि त्यांचा PRAN व आधार सांगा, मी आज मिळवून देतो."'),
    flags: [t('Fee to "release" money', 'पैसा "जारी" करने का शुल्क', 'पैसे "मिळवून देण्यासाठी" शुल्क'), t('Asks for PRAN and Aadhaar', 'PRAN और आधार माँगता है', 'PRAN आणि आधार मागतो')],
    why: t('Genuine claims never need a fee paid to a caller. Raise issues only through the CRA grievance system or your POP branch.', 'असली दावे में फ़ोन करने वाले को शुल्क नहीं देना होता। समस्या केवल CRA शिकायत प्रणाली या POP शाखा से उठाएँ।', 'खऱ्या दाव्यात फोन करणाऱ्याला शुल्क द्यावे लागत नाही. तक्रार फक्त CRA तक्रार प्रणाली किंवा POP शाखेतून करा.') },
]

/** This week's three, rotating with the ISO week number. */
export function weeklyScams(week: string) {
  const n = Number(week.split('W')[1] ?? 0)
  return [0, 1, 2].map(i => SCAMS[(n * 3 + i) % SCAMS.length])
}
export const SHIELD_COINS = 15
