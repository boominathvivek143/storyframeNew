// The Two Monkeys — The Trap of Comparison
// Standard story template containing 18 vertical 9:16 scenes with multi-language
// voice lines (Tamil, English, Malayalam, Telugu, Hindi, Kannada), character cast,
// cinematic art style descriptions, caption lines, and sound effect cues.
// Designed to be downloaded as a template to feed directly to ChatGPT / LLMs.

export const SAMPLE_STORY_TWO_MONKEYS_JSON = {
  exportDate: "2026-09-05",
  videoMetadata: {
    filename: "Two monkeys were locked in the same cage. Whenever one of them completed a task.(1).mp4",
    duration_seconds: 54.77,
    fps: 30,
    width: 720,
    height: 1280,
    aspectRatio: "9:16",
    format: "mp4"
  },
  storyTitle: "The Two Monkeys — The Trap of Comparison",
  overallSummary: "Two monkeys are kept in the same cage and asked to complete the same kind of task. At first the rewards feel ordinary and there is no conflict. Then one monkey receives grapes while the other receives a carrot for the same effort. The carrot monkey becomes upset only after noticing the other monkey's better reward and eventually throws the carrot away. The story then shifts naturally to everyday human comparison: seeing what others have can make our own life feel smaller and can cause us to overlook what we already have. The final message is to stop measuring our lives against other people's lives and appreciate what is already ours.",
  styleCategory: "Dark cinematic hand-drawn Indian storybook illustration with laboratory-experiment and everyday-life metaphor",
  language: {
    voiceover: "Tamil",
    captions: "English"
  },
  visualStyle: {
    format: "Vertical 9:16",
    resolution: "1080x1920",
    look: "Dark cinematic hand-drawn storybook illustration, semi-realistic cartoon anatomy, bold black outlines, textured paper grain, expressive faces, warm red-orange practical lighting, deep blue-purple shadows, cracked-earth stylized floors and believable laboratory or village-city environments",
    lighting: "Warm red-orange spotlights with deep blue and purple ambient shadows",
    contrast: "High cinematic contrast",
    texture: "Subtle paper grain and slightly rough illustrated surfaces",
    animationStyle: "Animate still illustrations cinematically rather than using full cartoon animation",
    cameraStyle: "Slow push-ins, controlled pans, subtle tilts, restrained parallax, brief controlled handheld movement only during emotional reactions",
    avoid: [
      "3D animation",
      "plastic CGI appearance",
      "rubbery character movement",
      "excessive camera shake",
      "excessive zoom",
      "character morphing",
      "unrealistic anatomy",
      "fantasy costumes",
      "photorealistic live action",
      "modern glossy UI"
    ]
  },
  cast: [
    {
      "role": "monkey A",
      "description": "A small brown laboratory monkey with warm tan-brown fur, rounded ears, expressive dark eyes, slim natural anatomy, long curved tail and a slightly anxious but intelligent expression. No clothing.",
      "usage": "Primary comparison character. Repeat the complete appearance in every scene where it appears."
    },
    {
      "role": "monkey B",
      "description": "A slightly darker brown laboratory monkey with reddish-brown fur, rounded ears, expressive dark eyes, slim natural anatomy, long curved tail and a confident but natural expression. No clothing.",
      "usage": "Second comparison character. Repeat the complete appearance in every scene where it appears."
    },
    {
      "role": "the scientist",
      "description": "A slim adult laboratory researcher with a simple white lab coat, small round glasses, pale neutral skin tone, clipboard and calm observational expression. Minimal facial detail and no identifiable real-person likeness.",
      "usage": "Experiment observer. Repeat complete appearance whenever present."
    },
    {
      "role": "ordinary people",
      "description": "Simple human figures with natural proportions and varied neutral appearances, wearing plain everyday clothing. They represent people in the metaphor scenes rather than specific individuals.",
      "usage": "Metaphorical characters. Repeat complete appearance where needed."
    }
  ],
  masterPrompts: {
    imageGeneration: "Create a dark cinematic vertical 9:16 hand-drawn storybook illustration. Use semi-realistic cartoon anatomy, bold black outlines, textured paper grain, expressive faces, warm red-orange practical lighting, deep blue-purple shadows and grounded believable environments. Laboratory scenes should feel like a simple controlled animal experiment with metal cages, task devices, trays and a clipboard. Everyday metaphor scenes should remain simple and relatable. Keep character anatomy stable and natural. Do not use 3D CGI, glossy surfaces, fantasy styling or exaggerated cartoon proportions.",
    motionGeneration: "Animate the provided still image as a cinematic illustrated shot. Preserve exact character appearance, anatomy, environment and composition. Use subtle natural animal and human movement, slow camera movement, restrained parallax and controlled focus shifts. Do not redesign characters, morph objects, add characters or turn the image into full 3D animation.",
    negativePrompt: "3D CGI, photorealistic live action, plastic texture, glossy cartoon, anime, fantasy, futuristic setting, exaggerated anatomy, extra limbs, duplicate monkeys, distorted faces, morphing, changing fur color, changing clothing, excessive camera shake, excessive zoom, rubbery motion, text artifacts, watermarks"
  },
  scenes: [
    {
      scene_number: 1,
      timestamp: "00:00-00:03",
      duration_seconds: 3,
      image_prompt: "Two small brown laboratory monkeys are locked inside one large metal cage in a dim research room. Monkey A has warm tan-brown fur, rounded ears, expressive dark eyes, slim natural anatomy and a long curved tail. Monkey B has slightly darker reddish-brown fur, rounded ears, expressive dark eyes, slim natural anatomy and a long curved tail. A slim adult scientist in a white lab coat, small round glasses and holding a clipboard stands nearby. Red-orange overhead laboratory light, deep blue shadows, hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Slow push toward the locked cage. Both monkeys look around nervously while the scientist observes without dramatic movement.",
      voice_line: {
        ta: "ஒரே கூண்டுக்குள்ள இரண்டு குரங்குகளை வச்சிருந்தாங்க.",
        en: "Two monkeys were kept in the same cage.",
        ml: "ഒരേ കൂട്ടിനുള്ളിൽ രണ്ട് കുരങ്ങുകളെ വെച്ചിരുന്നു.",
        te: "ఒకే బోనులో రెండు కోతులను ఉంచారు.",
        hi: "एक ही पिंजरे में दो बंदरों को रखा गया था।",
        kn: "ಒಂದೇ ಪಂಜರದಲ್ಲಿ ಎರಡು ಕೋತಿಗಳನ್ನು ಇಟ್ಟಿದ್ದರು."
      },
      caption_text: "TWO MONKEYS\nONE CAGE",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 2,
      timestamp: "00:03-00:06",
      duration_seconds: 3,
      image_prompt: "Inside the metal laboratory cage, Monkey A presses a simple lever connected to a small reward machine. Monkey B watches from beside it. The scientist stands outside with a clipboard. Both monkeys have the exact established fur, ears, eyes, anatomy and long curved tails. Warm red-orange spotlight, dark laboratory background, hand-drawn cinematic storybook style, vertical 9:16.",
      motion_prompt: "Monkey A reaches for and presses the lever. The device gives a small mechanical response. Camera makes a controlled push toward the action.",
      voice_line: {
        ta: "ரெண்டு குரங்குகளுக்கும் ஒரு சின்ன வேலை கொடுப்பாங்க. முடிச்சதும் பரிசு கொடுப்பாங்க.",
        en: "They gave both monkeys a simple task. Finish it, and you got a reward.",
        ml: "രണ്ട് കുരങ്ങുകൾക്കും ഒരു ചെറിയ ജോലി കൊടുക്കും. തീർത്താൽ സമ്മാനവും കിട്ടും.",
        te: "రెండు కోతులకూ ఒక చిన్న పని ఇస్తారు. పూర్తి చేస్తే బహుమతి ఇస్తారు.",
        hi: "दोनों बंदरों को एक छोटा सा काम दिया जाता था। पूरा करने पर इनाम मिलता था।",
        kn: "ಎರಡು ಕೋತಿಗಳಿಗೂ ಒಂದು ಸಣ್ಣ ಕೆಲಸ ಕೊಡುತ್ತಿದ್ದರು. ಮುಗಿಸಿದರೆ ಬಹುಮಾನ ಸಿಗುತ್ತಿತ್ತು."
      },
      caption_text: "SAME TASK.\nA REWARD.",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 3,
      timestamp: "00:06-00:09",
      duration_seconds: 3,
      image_prompt: "The scientist places a simple orange carrot on a tray for Monkey A after the lever task. Monkey A takes the carrot while Monkey B looks toward it. The laboratory cage, task device, scientist, clipboard and both monkeys remain visually consistent. Cinematic hand-drawn illustration, vertical 9:16.",
      motion_prompt: "Animate the scientist sliding the carrot tray forward. Monkey A takes the carrot. Monkey B watches quietly. Slow side pan.",
      voice_line: {
        ta: "ஆரம்பத்துல... கிடைச்சது சாதாரண பரிசுதான். அதனால எந்தப் பிரச்சனையும் இல்ல.",
        en: "At first... the reward was ordinary. So there was no problem.",
        ml: "ആദ്യം... കിട്ടിയത് സാധാരണ സമ്മാനമായിരുന്നു. അതുകൊണ്ട് പ്രശ്നമൊന്നുമില്ലായിരുന്നു.",
        te: "మొదట్లో... సాధారణ బహుమతే ఇచ్చారు. అందుకే ఎలాంటి సమస్య లేదు.",
        hi: "शुरुआत में... इनाम साधारण था। इसलिए कोई परेशानी नहीं थी।",
        kn: "ಆರಂಭದಲ್ಲಿ... ಸಿಗುತ್ತಿದ್ದ ಬಹುಮಾನ ಸಾಮಾನ್ಯವಾಗಿತ್ತು. ಹಾಗಾಗಿ ಯಾವುದೇ ಸಮಸ್ಯೆ ಇರಲಿಲ್ಲ."
      },
      caption_text: "AT FIRST...\nNO PROBLEM",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 4,
      timestamp: "00:09-00:12",
      duration_seconds: 3,
      image_prompt: "A close laboratory shot labeled visually as a second test: the scientist offers Monkey B a small bunch of purple grapes after it completes the same kind of lever task, while Monkey A watches from the neighboring cage area. Monkey B has darker reddish-brown fur; Monkey A has warm tan-brown fur. Strong red-orange light, deep shadows, hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "The scientist extends the grape reward. Monkey B reaches for it and smiles naturally. Monkey A turns its head toward the grapes.",
      voice_line: {
        ta: "ஆனா அடுத்த தடவை... ஒரு சின்ன மாற்றம் பண்ணாங்க.",
        en: "But the next time... they made one small change.",
        ml: "പക്ഷേ അടുത്ത തവണ... അവർ ഒരു ചെറിയ മാറ്റം വരുത്തി.",
        te: "కానీ తర్వాతి సారి... వాళ్లు ఒక చిన్న మార్పు చేశారు.",
        hi: "लेकिन अगली बार... उन्होंने एक छोटा सा बदलाव किया।",
        kn: "ಆದರೆ ಮುಂದಿನ ಸಲ... ಅವರು ಒಂದು ಸಣ್ಣ ಬದಲಾವಣೆ ಮಾಡಿದರು."
      },
      caption_text: "THEN...\nONE SMALL CHANGE",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 5,
      timestamp: "00:12-00:15",
      duration_seconds: 3,
      image_prompt: "Monkey B happily holds and eats several purple grapes inside the metal cage. Monkey A stands nearby watching the grapes. The scientist records observations on a clipboard. Preserve the monkeys' exact fur colors, natural anatomy, rounded ears and long curved tails. Warm red-orange laboratory light, dark cinematic storybook style, vertical 9:16.",
      motion_prompt: "Monkey B eats the grapes contentedly. Monkey A slowly shifts its gaze from its own tray to Monkey B's grapes. Use a restrained focus shift.",
      voice_line: {
        ta: "அதே வேலையை முடிச்ச இந்தக் குரங்குக்கு... திராட்சை கொடுத்தாங்க.",
        en: "After the same task... this monkey got grapes.",
        ml: "അതേ ജോലി ചെയ്ത ഈ കുരങ്ങിന്... മുന്തിരി കൊടുത്തു.",
        te: "అదే పని పూర్తి చేసిన ఈ కోతికి... ద్రాక్ష ఇచ్చారు.",
        hi: "वही काम करने के बाद... इस बंदर को अंगूर दिए गए।",
        kn: "ಅದೇ ಕೆಲಸ ಮುಗಿಸಿದ ಈ ಕೋತಿಗೆ... ದ್ರಾಕ್ಷಿ ಕೊಟ್ಟರು."
      },
      caption_text: "SAME TASK.\nGRAPES.",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 6,
      timestamp: "00:15-00:18",
      duration_seconds: 3,
      image_prompt: "Monkey A completes the lever task again inside the metal cage. The scientist approaches with an ordinary carrot on a small tray, while Monkey B is visible in the adjacent section holding grapes. Monkey A looks at the carrot, then toward the grapes. Dark laboratory, red-orange overhead light, hand-drawn cinematic style, vertical 9:16.",
      motion_prompt: "Monkey A completes the lever action. The scientist presents the carrot. Monkey A immediately notices the grapes in Monkey B's hands. Camera slowly pushes toward Monkey A's changing expression.",
      voice_line: {
        ta: "ஆனா இதுக்கு... ஒரு கேரட். பக்கத்துல இருந்ததுக்கு மட்டும் திராட்சை.",
        en: "But this one got a carrot. The one next to it got grapes.",
        ml: "പക്ഷേ ഇതിന്... ഒരു കാരറ്റ്. അടുത്തിരുന്ന കുരങ്ങിന് മാത്രം മുന്തിരി.",
        te: "కానీ దీనికి... ఒక క్యారెట్. పక్కనున్న కోతికి మాత్రం ద్రాక్ష.",
        hi: "लेकिन इसे मिला... एक गाजर। बगल वाले बंदर को अंगूर।",
        kn: "ಆದರೆ ಇದಕ್ಕೆ... ಒಂದು ಕ್ಯಾರೆಟ್. ಪಕ್ಕದ ಕೋತಿಗೆ ಮಾತ್ರ ದ್ರಾಕ್ಷಿ."
      },
      caption_text: "SAME TASK.\nCARROT.",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 7,
      timestamp: "00:18-00:21",
      duration_seconds: 3,
      image_prompt: "Monkey A sits inside the cage staring at the carrot with a frustrated expression while Monkey B calmly eats grapes nearby. The scientist watches from outside with a clipboard. Keep both monkeys' established appearances exact. Red-orange spotlight isolates the cages, deep blue background, hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Monkey A looks from the carrot to the grapes several times. Its expression changes from confusion to frustration. Slow close-in camera movement.",
      voice_line: {
        ta: "அப்போதான்... இந்தக் குரங்கு பக்கத்துல இருக்கிற திராட்சையை கவனிச்சுது.",
        en: "That's when this monkey noticed the grapes next to it.",
        ml: "അപ്പോഴാണ്... ഈ കുരങ്ങ് അടുത്തുള്ള മുന്തിരി ശ്രദ്ധിച്ചത്.",
        te: "అప్పుడే... ఈ కోతి పక్కనున్న ద్రాక్షను గమనించింది.",
        hi: "तभी... इस बंदर की नज़र बगल वाले अंगूरों पर पड़ी।",
        kn: "ಆಗಲೇ... ಈ ಕೋತಿ ಪಕ್ಕದಲ್ಲಿದ್ದ ದ್ರಾಕ್ಷಿಯನ್ನು ಗಮನಿಸಿತು."
      },
      caption_text: "THEN IT NOTICED\nTHE GRAPES",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 8,
      timestamp: "00:21-00:24",
      duration_seconds: 3,
      image_prompt: "Monkey A angrily pushes the carrot away through the cage bars while the scientist recoils slightly in surprise. Monkey B continues holding grapes in the background. No graphic violence. Dark laboratory, strong red-orange light, expressive hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Animate Monkey A forcefully pushing the carrot away. The scientist reacts with surprise and steps back slightly. Use a brief controlled handheld movement.",
      voice_line: {
        ta: "அதுக்குப் பிறகு... கேரட் மேல இருந்த சந்தோஷமே போயிடுச்சு.",
        en: "After that... it couldn't feel happy about the carrot anymore.",
        ml: "അതിനുശേഷം... കാരറ്റിൽ ഉണ്ടായിരുന്ന സന്തോഷം തന്നെ പോയി.",
        te: "ఆ తర్వాత... క్యారెట్ చూసిన ఆనందమే పోయింది.",
        hi: "उसके बाद... गाजर देखकर भी उसे खुशी नहीं हुई।",
        kn: "ಅದಾದ ಮೇಲೆ... ಕ್ಯಾರೆಟ್ ನೋಡಿದ ಸಂತೋಷವೇ ಹೋಗಿಬಿಟ್ಟಿತು."
      },
      caption_text: "THE CARROT\nSTOPPED FEELING GOOD",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 9,
      timestamp: "00:24-00:27",
      duration_seconds: 3,
      image_prompt: "Monkey A sits alone inside the cage with the untouched carrot on the floor in front of it. Its shoulders are lowered and its face is sad. The scientist stands outside taking notes. The other monkey is not the focus. Warm light falls on the lonely monkey against deep shadows, hand-drawn cinematic illustration, vertical 9:16.",
      motion_prompt: "Monkey A lowers its head and stares at the untouched carrot. Slowly pull the camera back to emphasize isolation.",
      voice_line: {
        ta: "கடைசில... அந்தக் கேரட்டையே தூக்கி எறிஞ்சுடுச்சு.",
        en: "Finally... it threw the carrot away.",
        ml: "ഒടുവിൽ... അത് കാരറ്റ് തന്നെ വലിച്ചെറിഞ്ഞു.",
        te: "చివరికి... ఆ క్యారెట్‌నే విసిరేసింది.",
        hi: "आखिर में... उसने गाजर ही फेंक दिया।",
        kn: "ಕೊನೆಗೆ... ಅದು ಕ್ಯಾರೆಟ್ ಅನ್ನೇ ಎಸೆದುಬಿಟ್ಟಿತು."
      },
      caption_text: "IT THREW\nTHE CARROT",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 10,
      timestamp: "00:27-00:30",
      duration_seconds: 3,
      image_prompt: "A split-screen-like symbolic laboratory scene shows Monkey A and Monkey B performing similar lever tasks in separate cage sections while the scientist observes. Monkey B receives grapes; Monkey A receives a carrot. The contrast is visually clear but not exaggerated. Dark hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Alternate focus between the two monkeys completing similar tasks and receiving different rewards. Use a slow lateral camera move.",
      voice_line: {
        ta: "யோசிச்சுப் பாருங்க... கேரட் பிரச்சனை இல்ல. பக்கத்துல கிடைச்ச திராட்சைதான் பிரச்சனை.",
        en: "Think about it... the carrot wasn't the problem. The grapes next to it were.",
        ml: "ഒന്ന് ചിന്തിച്ചുനോക്കൂ... കാരറ്റ് പ്രശ്നമല്ല. അടുത്തുള്ള മുന്തിരിയാണ് പ്രശ്നമായത്.",
        te: "ఒక్కసారి ఆలోచించండి... క్యారెట్ సమస్య కాదు. పక్కనున్న ద్రాక్షే సమస్య.",
        hi: "सोचिए... गाजर समस्या नहीं थी। बगल वाले अंगूर समस्या बन गए।",
        kn: "ಯೋಚಿಸಿ ನೋಡಿ... ಕ್ಯಾರೆಟ್ ಸಮಸ್ಯೆಯಲ್ಲ. ಪಕ್ಕದಲ್ಲಿದ್ದ ದ್ರಾಕ್ಷಿಯೇ ಸಮಸ್ಯೆಯಾಯಿತು."
      },
      caption_text: "THE CARROT\nWASN'T THE PROBLEM",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 11,
      timestamp: "00:30-00:33",
      duration_seconds: 3,
      image_prompt: "Transition to a symbolic everyday-life scene: two ordinary people sit at separate simple dinner tables in the same dim street. One has a modest plate of food; the other has a large abundant meal. The person with the modest plate looks toward the larger meal and becomes unhappy. Hand-drawn cinematic storybook style, warm street lighting, vertical 9:16.",
      motion_prompt: "Slowly pan from the modest meal to the abundant meal and back to the unhappy person's face.",
      voice_line: {
        ta: "நம்ம வாழ்க்கையிலயும்... இதே மாதிரி சில நேரம் நடக்குது.",
        en: "In our lives too... sometimes the same thing happens.",
        ml: "നമ്മുടെ ജീവിതത്തിലും... ചിലപ്പോൾ ഇതുതന്നെ സംഭവിക്കും.",
        te: "మన జీవితాల్లో కూడా... కొన్నిసార్లు ఇలానే జరుగుతుంది.",
        hi: "हमारी ज़िंदगी में भी... कभी-कभी ऐसा ही होता है।",
        kn: "ನಮ್ಮ ಜೀವನದಲ್ಲೂ... ಕೆಲವೊಮ್ಮೆ ಹೀಗೆಯೇ ಆಗುತ್ತದೆ."
      },
      caption_text: "THE SAME THING\nHAPPENS TO US",
      sfx: [
        "low laboratory ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 12,
      timestamp: "00:33-00:36",
      duration_seconds: 3,
      image_prompt: "The same ordinary person sits with a perfectly adequate meal but looks across the street at another person enjoying a much richer dinner. The environment is simple and believable, with no specific real-world location. Dark purple evening shadows and warm lamp light, hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Animate the person taking one bite, then looking toward the richer meal and slowly losing their smile. Controlled push-in.",
      voice_line: {
        ta: "நம்மகிட்ட என்ன இருக்கு என்று பார்க்காம... அடுத்தவங்ககிட்ட என்ன இருக்கு என்று பார்க்க ஆரம்பிச்சுடுறோம்.",
        en: "Instead of seeing what we have... we start looking at what others have.",
        ml: "നമുക്ക് എന്തുണ്ട് എന്ന് നോക്കാതെ... മറ്റുള്ളവർക്ക് എന്തുണ്ട് എന്ന് നോക്കിത്തുടങ്ങും.",
        te: "మన దగ్గర ఏముంది అని చూడకుండా... ఎదుటివారి దగ్గర ఏముంది అని చూడటం మొదలుపెడతాం.",
        hi: "हमारे पास क्या है, यह देखने के बजाय... हम दूसरों के पास क्या है, यह देखने लगते हैं।",
        kn: "ನಮ್ಮ ಬಳಿ ಏನಿದೆ ಎಂದು ನೋಡದೆ... ಇತರರ ಬಳಿ ಏನಿದೆ ಎಂದು ನೋಡಲು ಶುರುಮಾಡುತ್ತೇವೆ."
      },
      caption_text: "WE LOOK AT\nWHAT OTHERS HAVE",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 13,
      timestamp: "00:36-00:39",
      duration_seconds: 3,
      image_prompt: "A symbolic street scene shows a cheerful group of ordinary people sharing food and talking together in the background while one person sits alone on a bench in the foreground, looking down sadly. The contrast is about perception, not actual deprivation. Warm streetlamp, deep purple sky, hand-drawn storybook illustration, vertical 9:16.",
      motion_prompt: "Keep the group moving naturally in the background while the foreground person remains still. Slowly rack focus from the happy group to the lonely observer.",
      voice_line: {
        ta: "அவங்க வாழ்க்கையைப் பார்த்ததும்... நம்ம வாழ்க்கை குறைவா தெரிய ஆரம்பிச்சுடுது.",
        en: "After seeing their life... our own life starts to feel smaller.",
        ml: "അവരുടെ ജീവിതം കണ്ടതോടെ... നമ്മുടെ ജീവിതം കുറവായി തോന്നിത്തുടങ്ങും.",
        te: "వాళ్ల జీవితాన్ని చూసిన తర్వాత... మన జీవితం తక్కువగా అనిపించడం మొదలవుతుంది.",
        hi: "दूसरों की ज़िंदगी देखकर... अपनी ज़िंदगी छोटी लगने लगती है।",
        kn: "ಅವರ ಜೀವನವನ್ನು ನೋಡಿದ ಮೇಲೆ... ನಮ್ಮ ಜೀವನ ಕಡಿಮೆ ಅನ್ನಿಸತೊಡಗುತ್ತದೆ."
      },
      caption_text: "OUR LIFE\nSTARTS TO FEEL SMALL",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 14,
      timestamp: "00:39-00:42",
      duration_seconds: 3,
      image_prompt: "A person carrying a basket full of fresh food walks through a narrow rural lane while another person watches from the side. The watcher already has a smaller basket of food but ignores it while looking at the larger basket. Dark cinematic hand-drawn storybook illustration, warm orange lamp light, vertical 9:16.",
      motion_prompt: "Track the person carrying the larger basket. The watcher glances down at their own basket, then back at the other basket with envy. Subtle motion only.",
      voice_line: {
        ta: "அப்புறம்... நம்மகிட்ட ஏற்கனவே இருக்கிற நல்ல விஷயங்களைக்கூட மறந்துடுறோம்.",
        en: "And then... we forget the good things we already have.",
        ml: "പിന്നെ... നമ്മുടെ കൈയിൽ ഇതിനകം ഉള്ള നല്ല കാര്യങ്ങൾ പോലും നമ്മൾ മറക്കും.",
        te: "ఆ తర్వాత... మన దగ్గర ఇప్పటికే ఉన్న మంచి విషయాలనే మర్చిపోతాం.",
        hi: "फिर... हमारे पास पहले से मौजूद अच्छी चीज़ों को भी हम भूल जाते हैं।",
        kn: "ಆಮೇಲೆ... ನಮ್ಮ ಬಳಿ ಈಗಾಗಲೇ ಇರುವ ಒಳ್ಳೆಯ ಸಂಗತಿಗಳನ್ನೂ ಮರೆತುಬಿಡುತ್ತೇವೆ."
      },
      caption_text: "WE FORGET\nWHAT WE HAVE",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 15,
      timestamp: "00:42-00:45",
      duration_seconds: 3,
      image_prompt: "A lone ordinary person sits under a streetlamp at night while a lively group of people enjoys a meal in the distance. The person looks down at a simple meal in their own hands, then looks upward thoughtfully. Dark blue-purple night, warm lamp pool, hand-drawn cinematic storybook style, vertical 9:16.",
      motion_prompt: "Slow push toward the person as their expression changes from sadness to reflection. The distant group remains softly animated.",
      voice_line: {
        ta: "சந்தோஷம் குறைவதுக்கு... நம்மகிட்ட இல்லாதது மட்டும் காரணம் இல்ல.",
        en: "The reason we lose happiness... isn't always because we lack something.",
        ml: "സന്തോഷം കുറയാൻ... നമ്മുടെ കൈയിൽ ഇല്ലാത്തതുമാത്രമല്ല കാരണം.",
        te: "సంతోషం తగ్గడానికి... మన దగ్గర లేనిదే ఎప్పుడూ కారణం కాదు.",
        hi: "खुशी कम होने की वजह... हमेशा यह नहीं होती कि हमारे पास कुछ नहीं है।",
        kn: "ಸಂತೋಷ ಕಡಿಮೆಯಾಗುವುದಕ್ಕೆ... ನಮ್ಮ ಬಳಿ ಇಲ್ಲದಿರುವುದೇ ಯಾವಾಗಲೂ ಕಾರಣವಲ್ಲ."
      },
      caption_text: "LACK ISN'T\nALWAYS THE PROBLEM",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 16,
      timestamp: "00:45-00:48",
      duration_seconds: 3,
      image_prompt: "Return to the laboratory. Monkey A with warm tan-brown fur sits inside the cage beside an untouched carrot while Monkey B with reddish-brown fur calmly eats grapes in the neighboring section. The scientist observes. The visual echoes the earlier experiment. Dark red-orange light, deep shadows, hand-drawn illustration, vertical 9:16.",
      motion_prompt: "Match the earlier laboratory composition. Monkey A slowly looks at its carrot, then away from Monkey B. Camera makes a gentle pull-back.",
      voice_line: {
        ta: "சில நேரம்... ஒப்பிட ஆரம்பிக்கிறதுதான் காரணம்.",
        en: "Sometimes... the problem begins when we start comparing.",
        ml: "ചിലപ്പോൾ... നമ്മൾ താരതമ്യം ചെയ്യാൻ തുടങ്ങുന്നതാണ് കാരണം.",
        te: "కొన్నిసార్లు... మనం పోల్చడం మొదలుపెట్టినప్పుడే సమస్య మొదలవుతుంది.",
        hi: "कभी-कभी... परेशानी तुलना शुरू करने से होती है।",
        kn: "ಕೆಲವೊಮ್ಮೆ... ನಾವು ಹೋಲಿಕೆ ಮಾಡಲು ಶುರು ಮಾಡಿದಾಗಲೇ ಸಮಸ್ಯೆ ಆರಂಭವಾಗುತ್ತದೆ."
      },
      caption_text: "COMPARISON\nIS THE PROBLEM",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 17,
      timestamp: "00:48-00:51",
      duration_seconds: 3,
      image_prompt: "Monkey A finally picks up its carrot and looks at it calmly while the scientist watches from outside. Monkey B remains in the background with grapes. The moment is quiet and reflective rather than triumphant. Warm soft light, deep shadows, hand-drawn cinematic storybook illustration, vertical 9:16.",
      motion_prompt: "Monkey A slowly reaches for the carrot and takes a small bite. Its expression relaxes. Use a slow close-up and gentle focus shift.",
      voice_line: {
        ta: "அதனால... அடுத்தவங்க வாழ்க்கையை வைத்து நம்ம வாழ்க்கையை அளக்காதீங்க. நமக்குக் கிடைச்சதை ரசிங்க.",
        en: "So... don't measure your life against someone else's. Appreciate what you have.",
        ml: "അതുകൊണ്ട്... മറ്റുള്ളവരുടെ ജീവിതം നോക്കി നിങ്ങളുടെ ജീവിതത്തെ അളക്കരുത്. നിങ്ങൾക്കുള്ളത് ആസ്വദിക്കൂ.",
        te: "అందుకే... ఇంకొకరి జీవితంతో మీ జీవితాన్ని కొలవకండి. మీ దగ్గర ఉన్నదాన్ని ఆస్వాదించండి.",
        hi: "इसलिए... अपनी ज़िंदगी को किसी और की ज़िंदगी से मत तौलो। जो है, उसकी कद्र करो।",
        kn: "ಆದ್ದರಿಂದ... ಇನ್ನೊಬ್ಬರ ಜೀವನದ ಜೊತೆ ನಿಮ್ಮ ಜೀವನವನ್ನು ಅಳೆಯಬೇಡಿ. ನಿಮ್ಮ ಬಳಿ ಇರುವುದನ್ನು ಆನಂದಿಸಿ."
      },
      caption_text: "DON'T MEASURE\nYOUR LIFE",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    },
    {
      scene_number: 18,
      timestamp: "00:51-00:54",
      duration_seconds: 3.77,
      image_prompt: "A final symbolic composition: an ordinary person sits peacefully at a simple table at night, eating a modest meal with a relaxed smile. In the far background, other people are present but softly out of focus. A small warm lantern illuminates the table while the surrounding environment fades into deep blue night. Hand-drawn cinematic storybook illustration, bold outlines, textured paper grain, vertical 9:16.",
      motion_prompt: "Begin with a slow push toward the peaceful person and their simple meal. Let the background fall softly out of focus. End on the relaxed expression and a subtle pause.",
      voice_line: {
        ta: "நம்ம சந்தோஷத்துக்கு... நாம்தான் அளவு வைக்கணும். அடுத்தவங்க வாழ்க்கையை வைத்து... நம்ம வாழ்க்கையை அளக்கக்கூடாது.",
        en: "We should decide what happiness means for us. We shouldn't measure our life by someone else's.",
        ml: "നമ്മുടെ സന്തോഷത്തിന്... നമ്മൾ തന്നെയാണ് അർത്ഥം നിശ്ചയിക്കേണ്ടത്. മറ്റൊരാളുടെ ജീവിതം നോക്കി... നമ്മുടെ ജീവിതത്തെ അളക്കരുത്.",
        te: "మన సంతోషానికి... మనమే అర్థం నిర్ణయించాలి. ఇంకొకరి జీవితాన్ని చూసి... మన జీవితాన్ని కొలవకూడదు.",
        hi: "अपनी खुशी का मतलब... हमें खुद तय करना चाहिए। किसी और की ज़िंदगी से... अपनी ज़िंदगी को नहीं तौलना चाहिए।",
        kn: "ನಮ್ಮ ಸಂತೋಷಕ್ಕೆ... ನಾವೇ ಅರ್ಥ ಕೊಡಬೇಕು. ಇನ್ನೊಬ್ಬರ ಜೀವನವನ್ನು ನೋಡಿ... ನಮ್ಮ ಜೀವನವನ್ನು ಅಳೆಯಬಾರದು."
      },
      caption_text: "DON'T LET COMPARISON\nSTEAL YOUR HAPPINESS",
      sfx: [
        "soft environmental ambience",
        "subtle cinematic pulse",
        "light movement sounds"
      ],
      continuity_note: "Maintain established character appearance and grounded hand-drawn style; no new named characters."
    }
  ],
  sfxTimeline: [
    {
      timestamp: "00:00-00:09",
      sound: "dark laboratory ambience, cage metal, task-device clicks"
    },
    {
      timestamp: "00:09-00:24",
      sound: "laboratory ambience, reward tray movement, subtle tension, brief impact when carrot is pushed"
    },
    {
      timestamp: "00:24-00:30",
      sound: "quiet cage ambience, low reflective tone"
    },
    {
      timestamp: "00:30-00:45",
      sound: "soft evening ambience, distant people, subtle street sounds, reflective music bed"
    },
    {
      timestamp: "00:45-00:54",
      sound: "return to laboratory ambience, gentle warm music, soft final resolve"
    }
  ],
  voiceoverDirection: {
    voiceStyle: "Natural spoken Tamil storytelling, conversational and intimate",
    recommendedVoice: "Natural Tamil narrative voice — warm, calm, believable, not theatrical",
    delivery: "Read the 18 scene lines as one continuous story, not as 18 separate announcements. Keep the first half curious and observational. Slow slightly at the moment the carrot monkey notices the grapes. Make the comparison realization clear but understated. From scene 11 onward, shift naturally from the experiment to everyday life as if telling the viewer, 'this happens to us too.' The final two scenes should feel calm and reassuring rather than preachy. Do not over-act, shout, or use formal literary Tamil.",
    pauseRules: {
      ellipsis: "Use ... for short natural pauses and realization beats.",
      comma: "Use commas for brief breathing pauses.",
      period: "Use periods for normal sentence endings.",
      lineBreaks: "Treat each scene as a timing unit, but keep the narration emotionally continuous across scene cuts."
    }
  },
  captionStyle: {
    language: "English",
    position: "bottom-center",
    fontStyle: "bold modern sans-serif",
    color: "white",
    outline: "thin black outline with subtle drop shadow",
    maximumLines: 2,
    animation: "short fade in and fade out",
    highlight: "Optional yellow emphasis on one or two important words",
    timing: "Synchronize to Tamil voiceover rather than displaying captions independently."
  },
  videoGeneration: {
    workflow: "Generate each scene image independently, then animate each still independently.",
    sceneIndependence: true,
    characterDependency: false,
    crossSceneReferenceRequired: false,
    referenceFrames: false,
    generationRules: [
      "Every image_prompt must be understandable without access to any other scene.",
      "Every motion_prompt must be understandable without access to any other scene.",
      "Do not require the generation system to resolve a character ID.",
      "Do not use phrases such as 'same character as previous scene' or 'same as cast'.",
      "Repeat complete visual descriptions inside every scene where a recurring character appears.",
      "Maintain visual continuity through repeated descriptions rather than external dependencies.",
      "Do not introduce names for any character.",
      "Use role descriptions such as 'monkey A', 'monkey B', 'the scientist' and 'ordinary people'."
    ]
  },
  recreationBlueprint: {
    cameraDirectorNotes: [
      "Use slow pushes for realization.",
      "Use controlled close-ups on the monkeys' expressions.",
      "Use focus shifts between unequal rewards.",
      "Use a brief controlled handheld move only when the carrot is pushed away.",
      "Use wider metaphor shots to connect the experiment to everyday comparison.",
      "End with a slow peaceful push toward the final meal."
    ],
    editingPacingNotes: [
      "First 9 seconds establish the experiment quickly.",
      "9-24 seconds should build the comparison conflict.",
      "24-30 seconds should slow down and show emotional consequence.",
      "30-45 seconds transition into relatable everyday-life metaphors.",
      "45-54 seconds return to the experiment and resolve with a calm lesson."
    ],
    stepByStepGuide: [
      "Generate all 18 still images independently from their image_prompt.",
      "Review each image for stable monkey anatomy, fur color, cage geometry and scientist appearance.",
      "Animate each still independently using its motion_prompt.",
      "Generate the Tamil voiceover as one continuous narration, then align each scene line to its visual beat.",
      "Keep each scene's spoken content limited to what is visible or immediately implied by that shot.",
      "Add English captions according to caption_text.",
      "Add SFX according to the SFX timeline.",
      "Use subtle cinematic transitions between laboratory and everyday-life scenes.",
      "Keep the final output at 9:16 and 54.77 seconds."
    ],
    recommendedTools: [
      "ElevenLabs or another natural Tamil voice generator",
      "Image generation model for scene stills",
      "Image-to-video model for cinematic motion",
      "Video editor for timing, captions, SFX and final assembly"
    ]
  },
  aiProvider: {
    imageGeneration: "Any high-quality image generation model",
    videoGeneration: "Any image-to-video model supporting cinematic motion",
    voiceGeneration: "ElevenLabs"
  },
  generationJob: {
    totalScenes: 18,
    targetDurationSeconds: 54.77,
    aspectRatio: "9:16",
    generateImagesIndependently: true,
    generateVideosIndependently: true,
    useExternalCharacterReferences: false,
    preserveScenePromptIntegrity: true
  },
  export: {
    resolution: "1080x1920",
    fps: 30,
    format: "MP4",
    videoCodec: "H.264",
    audioCodec: "AAC",
    targetDurationSeconds: 54.77,
    aspectRatio: "9:16"
  },
  sourceAnalysis: {
    "sourceVideo": "Two monkeys were locked in the same cage. Whenever one of them completed a task.(1).mp4",
    "observedStructure": "Laboratory monkey experiment -> unequal grape/carrot rewards -> frustrated comparison -> everyday-life comparison -> reflective resolution.",
    "visualEvidence": "The video visibly shows two monkeys in cages, a scientist, lever-based tasks, grapes and carrots, followed by symbolic human scenes involving unequal meals, social happiness and a final peaceful meal.",
    "transcriptionNote": "The source audio was not used as an authoritative word-for-word transcript; the story wording in this JSON is rebuilt from the observed visual sequence and the supplied video title.",
    "narrativeSyncNote": "The narration is intentionally rebuilt as a single continuous Tamil story and split into 18 scene-sized beats. Each beat is synchronized to the visible action: cage introduction, task, ordinary reward, reward change, grapes, carrot, noticing the grapes, frustration, rejection of carrot, human comparison, emotional consequence, and final acceptance/appreciation. The narration does not introduce a conclusion before the corresponding visual appears."
  }
};

export const SAMPLE_STORY_WELL_OF_RATS_JSON = SAMPLE_STORY_TWO_MONKEYS_JSON;
export const RAT_TRAP_STORY_JSON = SAMPLE_STORY_TWO_MONKEYS_JSON;
