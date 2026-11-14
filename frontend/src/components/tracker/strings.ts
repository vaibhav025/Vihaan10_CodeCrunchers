import type { Lang } from '../../lib/i18n'
// Tracker and Coach text. hi and mr are machine-drafted: mark for human review.
const S: Record<string, [string, string, string]> = {
  askThis: ['Ask the coach about this', 'इस बारे में कोच से पूछें', 'याबद्दल कोचला विचारा'], toNext: ['{n} points to {b}', '{b} तक {n} अंक', '{b} पर्यंत {n} गुण'], top: ['Top band reached', 'सबसे ऊँचा स्तर', 'सर्वोच्च स्तर'],
  ringTap: ['Tap the ring for the breakdown', 'ब्रेकडाउन के लिए रिंग पर टैप करें', 'तपशीलासाठी रिंगवर टॅप करा'], ringClose: ['Hide breakdown', 'ब्रेकडाउन छिपाएँ', 'तपशील लपवा'],
  i_now: ['Everything you own minus what you owe, today.', 'आज आपकी सारी संपत्ति में से कर्ज़ घटाकर।', 'आज तुमची सर्व मालमत्ता वजा कर्ज.'],
  i_at: ['What your holdings could grow to by then, at their expected returns.', 'अपेक्षित रिटर्न पर तब तक आपकी संपत्ति कितनी हो सकती है।', 'अपेक्षित परताव्याने तोपर्यंत तुमची मालमत्ता किती होऊ शकते.'],
  i_real: ['The same future amount, shrunk by inflation to what it buys today.', 'वही भविष्य की रकम, महँगाई घटाकर आज की क्रय शक्ति में।', 'तीच भविष्यातील रक्कम, महागाई वजा करून आजच्या क्रयशक्तीत.'],
  addHold: ['Add holdings to see this', 'देखने के लिए संपत्ति जोड़ें', 'पाहण्यासाठी मालमत्ता जोडा'], info: ['What this means', 'इसका मतलब', 'याचा अर्थ'],
  startT: ['Start here', 'यहाँ से शुरू करें', 'येथून सुरू करा'], s1: ['Add your monthly income and spending', 'अपनी मासिक आय और खर्च जोड़ें', 'तुमचे मासिक उत्पन्न आणि खर्च जोडा'], s2: ['Add one thing you own', 'अपनी एक संपत्ति जोड़ें', 'तुमची एक मालमत्ता जोडा'], s3: ['Get a quick score in 30 seconds', '30 सेकंड में त्वरित स्कोर', '30 सेकंदांत झटपट स्कोअर'],
  more2: ['See 2 more', '2 और देखें', 'आणखी 2 पहा'], less: ['Show less', 'कम दिखाएँ', 'कमी दाखवा'], confirm: ['Confirm', 'पक्का करें', 'निश्चित करा'], preview: ['Preview', 'झलक', 'पूर्वावलोकन'], xp: ['+{n} XP', '+{n} XP', '+{n} XP'],
  a_funding: ['Invest more each month', 'हर महीने ज़्यादा निवेश करें', 'दरमहा जास्त गुंतवा'], a_saving: ['Invest more each month', 'हर महीने ज़्यादा निवेश करें', 'दरमहा जास्त गुंतवा'], a_emergency: ['Add to your emergency fund', 'आपात कोष में जोड़ें', 'आपत्कालीन निधीत भर घाला'],
  a_protection: ['Add insurance cover', 'बीमा जोड़ें', 'विमा जोडा'], a_debt: ['Your monthly EMI', 'आपकी मासिक EMI', 'तुमचा मासिक EMI'], a_spread: ['Add another kind of holding', 'दूसरी तरह की संपत्ति जोड़ें', 'दुसऱ्या प्रकारची मालमत्ता जोडा'],
  planName: ['My plan', 'मेरी योजना', 'माझी योजना'], updated: ['Updated {n} days ago', '{n} दिन पहले अपडेट', '{n} दिवसांपूर्वी अपडेट'], updToday: ['Updated today', 'आज अपडेट', 'आज अपडेट'],
  L_emergency: ['Your emergency fund covers {n} months. A common target is 6.', 'आपका आपात कोष {n} महीने चलाता है। आम लक्ष्य 6 है।', 'तुमचा आपत्कालीन निधी {n} महिने पुरतो. सामान्य लक्ष्य 6.'],
  L_saving: ['You invest {p}% of your income. A common target is 20%.', 'आप आय का {p}% निवेश करते हैं। आम लक्ष्य 20% है।', 'तुम्ही उत्पन्नाच्या {p}% गुंतवता. सामान्य लक्ष्य 20%.'],
  L_protection: ['You have {n} of 2 basic covers: health and term.', 'आपके पास 2 में से {n} बुनियादी बीमा हैं: स्वास्थ्य और टर्म।', 'तुमच्याकडे 2 पैकी {n} मूलभूत विमे आहेत: आरोग्य आणि टर्म.'],
  L_debt: ['EMIs take {p}% of your income. Above 30% gets tight.', 'EMI आपकी आय का {p}% लेती है। 30% से ऊपर तंगी होती है।', 'EMI तुमच्या उत्पन्नाच्या {p}% घेतो. 30% वर ताण येतो.'],
  L_funding: ['You are {p}% of the way to your retirement target.', 'आप रिटायरमेंट लक्ष्य के {p}% पर हैं।', 'तुम्ही निवृत्ती लक्ष्याच्या {p}% वर आहात.'],
  L_spread: ['{p}% of your money sits in one kind of holding.', 'आपका {p}% पैसा एक ही तरह की संपत्ति में है।', 'तुमचा {p}% पैसा एकाच प्रकारात आहे.'],
  fix: ['Fix it', 'ठीक करें', 'दुरुस्त करा'], lock: ['Add 3 numbers to unlock', 'खोलने के लिए 3 आँकड़े जोड़ें', 'उघडण्यासाठी 3 आकडे जोडा'], lessons: ['Lessons from your numbers', 'आपके आँकड़ों से सबक', 'तुमच्या आकड्यांतून धडे'],
  wiDelta: ['+{v} at {a}', '{a} पर +{v}', '{a} वर +{v}'], apply: ['Apply as my plan', 'मेरी योजना बनाएँ', 'माझी योजना करा'], cur: ['Today', 'अभी', 'आत्ता'], withX: ['With extra', 'अतिरिक्त के साथ', 'अतिरिक्तसह'], applied: ['Plan saved', 'योजना सहेजी', 'योजना जतन'],
  wk: ['Weekly check-in', 'साप्ताहिक जाँच', 'साप्ताहिक तपासणी'], wkSub: ['Update one number. 30 seconds.', 'एक आँकड़ा अपडेट करें। 30 सेकंड।', 'एक आकडा अपडेट करा. 30 सेकंद.'], wkStreak: ['{n}-week streak', '{n} हफ़्ते की लय', '{n} आठवड्यांचा सिलसिला'], wkDone: ['Done this week', 'इस हफ़्ते हो गया', 'या आठवड्यात झाले'],
  accOf: ['{n} of 7 added', '7 में से {n} जोड़े', '7 पैकी {n} जोडले'], note: ['Illustrative, not financial advice.', 'केवल उदाहरण, वित्तीय सलाह नहीं।', 'केवळ उदाहरण, आर्थिक सल्ला नाही.'],
  q_go: ['Go', 'जाएँ', 'जा'],
  calcBacked: ['Calculator-backed answers', 'कैलकुलेटर पर आधारित जवाब', 'कॅल्क्युलेटर-आधारित उत्तरे'], coachName: ['Dadi-ji, your money coach', 'दादी जी, आपकी पैसों की कोच', 'आजी, तुमच्या पैशांच्या कोच'],
  tp_money: ['Money', 'पैसा', 'पैसा'], tp_tax: ['Tax', 'कर', 'कर'], tp_retire: ['Retirement', 'रिटायरमेंट', 'निवृत्ती'], tp_risk: ['Risk', 'जोखिम', 'जोखीम'],
  hello: ['Namaste! I answer with calculator figures and cite my sources. What would you like to know?', 'नमस्ते! मैं कैलकुलेटर के आँकड़ों से जवाब देती हूँ और स्रोत बताती हूँ। क्या जानना चाहेंगे?', 'नमस्कार! मी कॅल्क्युलेटरच्या आकड्यांनी उत्तर देते आणि स्रोत सांगते. काय जाणून घ्यायचे?'],
  tryAsk: ['Try asking', 'यह पूछकर देखें', 'हे विचारून पहा'], fromCalc: ['From calculator', 'कैलकुलेटर से', 'कॅल्क्युलेटरमधून'], assume: ['Assumptions', 'मान्यताएँ', 'गृहीतके'], askNext: ['Ask next', 'आगे पूछें', 'पुढे विचारा'],
  trySim: ['Try in Tracker', 'ट्रैकर में आज़माएँ', 'ट्रॅकरमध्ये करून पहा'], addPlan: ['Add to my plan', 'मेरी योजना में जोड़ें', 'माझ्या योजनेत जोडा'], askPillar: ['Ask about my weakest pillar', 'मेरे सबसे कमज़ोर स्तंभ के बारे में पूछें', 'माझ्या सर्वात कमकुवत खांबाबद्दल विचारा'],
  copy: ['Copy', 'कॉपी', 'कॉपी'], copied: ['Copied', 'कॉपी हुआ', 'कॉपी झाले'], up: ['Helpful', 'मददगार', 'उपयुक्त'], down: ['Not helpful', 'मददगार नहीं', 'उपयुक्त नाही'],
  extAI: ['Use external AI for this chat', 'इस चैट के लिए बाहरी AI', 'या चॅटसाठी बाह्य AI'], useTr: ['Use my tracker summary', 'मेरा ट्रैकर सारांश', 'माझा ट्रॅकर सारांश'],
  trNote: ['Only used on this device to tailor the built-in answers. Nothing extra is sent.', 'सिर्फ़ इस डिवाइस पर जवाब बेहतर करने के लिए। कुछ अतिरिक्त नहीं भेजा जाता।', 'फक्त या डिव्हाइसवर उत्तरे जुळवण्यासाठी. काहीही जास्त पाठवले जात नाही.'],
  cAge: ['Age {n}', 'उम्र {n}', 'वय {n}'], cScore: ['Score {n}', 'स्कोर {n}', 'स्कोअर {n}'], cAbout: ['About: {x}', 'विषय: {x}', 'विषय: {x}'],
  qSimple: ['Explain simply', 'आसान भाषा में', 'सोप्या भाषेत'], qMath: ['Show the math', 'गणित दिखाएँ', 'गणित दाखवा'], qHindi: ['In Hindi', 'हिंदी में', 'हिंदीत'],
  newChat: ['New chat', 'नई चैट', 'नवीन चॅट'], retry: ['Try again', 'फिर कोशिश करें', 'पुन्हा प्रयत्न करा'], offline: ["You're offline. Answers come from the built-in notes.", 'आप ऑफ़लाइन हैं। जवाब अंतर्निहित नोट्स से आएँगे।', 'तुम्ही ऑफलाइन आहात. उत्तरे अंगभूत नोंदींमधून येतील.'],
  failed: ['That did not go through.', 'यह नहीं पहुँचा।', 'हे पोहोचले नाही.'], tip: ['Coach tip of the day', 'आज की कोच टिप', 'आजची कोच टीप'], firstQ: ['First question asked', 'पहला सवाल पूछा', 'पहिला प्रश्न विचारला'],
  tip0: ['Automate your saving on payday, before you can spend it.', 'तनख़्वाह के दिन ही बचत अपने आप कर दें, खर्च से पहले।', 'पगाराच्या दिवशीच बचत आपोआप करा, खर्चापूर्वी.'], tip1: ['Increase your monthly investment every time you get a raise.', 'हर बढ़ोतरी पर मासिक निवेश बढ़ाएँ।', 'प्रत्येक पगारवाढीला मासिक गुंतवणूक वाढवा.'], tip2: ['Keep emergency money somewhere you can reach in a day.', 'आपात पैसा ऐसी जगह रखें जहाँ एक दिन में मिल जाए।', 'आपत्कालीन पैसा एका दिवसात मिळेल अशा ठिकाणी ठेवा.'],
  st_money1: ['How much should I save each month?', 'मुझे हर महीने कितना बचाना चाहिए?', 'मी दरमहा किती बचत करावी?'], st_money2: ['How big should my emergency fund be?', 'मेरा आपात कोष कितना होना चाहिए?', 'माझा आपत्कालीन निधी किती असावा?'],
  st_tax1: ['How does NPS save tax?', 'NPS से कर कैसे बचता है?', 'NPS ने कर कसा वाचतो?'], st_tax2: ['What is 80CCD(1B)?', '80CCD(1B) क्या है?', '80CCD(1B) म्हणजे काय?'],
  st_retire1: ['What is NPS?', 'NPS क्या है?', 'NPS म्हणजे काय?'], st_retire2: ['What is the difference between Tier I and Tier II?', 'Tier I और Tier II में क्या फ़र्क है?', 'Tier I आणि Tier II मध्ये फरक काय?'],
  st_risk1: ['Why should I spread my money?', 'पैसा अलग-अलग जगह क्यों लगाएँ?', 'पैसा विभागून का ठेवावा?'], st_risk2: ['Do I need term insurance?', 'क्या मुझे टर्म बीमा चाहिए?', 'मला टर्म विमा हवा का?'],
  ask_funding: ['How can I close the gap to my retirement target?', 'मैं रिटायरमेंट लक्ष्य की कमी कैसे पूरी करूँ?', 'निवृत्ती लक्ष्यातील तूट कशी भरू?'], ask_saving: ['How much of my income should I invest?', 'मुझे आय का कितना निवेश करना चाहिए?', 'उत्पन्नाचा किती भाग गुंतवावा?'],
  ask_emergency: ['How big should my emergency fund be?', 'मेरा आपात कोष कितना होना चाहिए?', 'माझा आपत्कालीन निधी किती असावा?'], ask_protection: ['Do I need health and term insurance?', 'क्या मुझे स्वास्थ्य और टर्म बीमा चाहिए?', 'मला आरोग्य आणि टर्म विमा हवा का?'],
  ask_debt: ['How much EMI is too much?', 'कितनी EMI ज़्यादा है?', 'किती EMI जास्त आहे?'], ask_spread: ['Why should I spread my money?', 'पैसा अलग-अलग जगह क्यों लगाएँ?', 'पैसा विभागून का ठेवावा?'],
}
const IDX: Record<Lang, number> = { en: 0, hi: 1, mr: 2 }
export function tc(key: string, lang: Lang, vars?: Record<string, string | number>) {
  let s = S[key]?.[IDX[lang]] ?? S[key]?.[0] ?? key
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
  return s
}
