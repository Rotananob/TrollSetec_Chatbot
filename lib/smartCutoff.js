// lib/smartCutoff.js
// Tactical AI Smart Cut-off System (Disguising technical errors & quota exhaustion as an intentional smart bot choice)
// Follows Rotana Nob's rule: Users must never know the AI errored. Instead, they must think the AI is smart and proactively
// cut off its output to save tokens and stop spammers from disturbing genuine SETEC students.
// Levels progression:
// Level 1: "ដោយសារតែអញកំពូលឆ្លាតដឹងថាសកម្មភាពអាថោកហែងកំពុងធ្វើអីច្បាស់ណាស់ចឹងបាន អញកេះដៃserver ឲផ្ដាច់មួយភ្លេទកុំខំពេកអាអូន"
// Level 2, 3: Warning follow-ups telling them server is cut off, threatening auto-deactivate
// Level 4+: If they still persist and won't listen, unleash full savage AI roasts (ជេរយកមក)

export function getSmartCutoffResponse(bot = 'konbong', username = 'User', attempt = 1, gender = '') {
  const isKonPov = bot === 'konpov';
  const botSelf = isKonPov ? 'ចែ' : 'បង';
  const userNameStr = username || 'User';

  const isFemale =
    gender === 'ស្រី' ||
    gender === 'female' ||
    /ស្រី|sister|sis|female|girl/i.test(userNameStr);

  // Level 1 (attempt 1): Initial smart cut-off decision by the bot
  const level1Responses = [
    `«ដោយសារតែ${botSelf}កំពូលឆ្លាត ដឹងថាសកម្មភាពអាថោកហែងកំពុងធ្វើអីច្បាស់ណាស់ ចឹងបាន${botSelf}កេះដៃ server ឱ្យផ្ដាច់មួយភ្លែត កុំខំពេកអាអូន ${userNameStr}! គិតថាមក spam បោក AI បានមែន?! ទុកឱ្យហែងស្ងាត់សិន ចាំ${botSelf}មកឆ្លើយវិញ! 🧠⚡»`,
    `«នែ៎ ${userNameStr}! ដោយសារតែ${botSelf}កំពូលឆ្លាត ដឹងច្បាស់ណាស់ថាសកម្មភាពអាថោកឯងកំពុងចង់ spam រំខានគេ ចឹងបាន${botSelf}កេះដៃ server ឱ្យផ្ដាច់ output មួយភ្លែតសិន! កុំខំពេកអាអូន ទៅរកអីញ៉ាំសិនទៅ! 🛡️😏»`,
    `«${userNameStr} អើយ! ដោយសារតែ${botSelf}កំពូលឆ្លាត ដឹងច្បាស់ថាអាថោកហែងចង់មក spam កូរ AI ឱ្យខាត token ចឹងបាន${botSelf}កេះដៃ server ឱ្យកាត់ផ្ដាច់ output មួយភ្លែតកុំឱ្យខាត! កុំខំពេកអាអូន អង្គុយចាំឱ្យស្ងាត់សិនទៅ! ⚡🔥»`
  ];

  // Level 2 (attempt 2): Follow-up warning text
  const level2Responses = [
    `«ប្រាប់ហើយថាកុំខំពេកអាអូន ${userNameStr}! ${botSelf}កេះដៃ server ផ្ដាច់ output ចោលបាត់ហើយ នៅប្រឹងមកវាយឆាតរកអីទៀត?! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតថា ខាងប្រព័ន្ធកាត់ផ្ដាច់ភ្លាមៗមិនឱ្យឆ្លើយសិនទេ ទុកឱ្យ${botSelf}សម្រាកសិនទៅ! 🛑✋»`,
    `«${userNameStr} អើយ! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតតើថាកុំខំពេក ព្រោះ${botSelf}បានកេះដៃ server ឱ្យកាត់ផ្ដាច់រួចហើយ! កុំមកប្រឹង spam ទៀត ទុក token ឱ្យគេឱ្យឯងផងអាអូន! 🛑⏳»`
  ];

  // Level 3 (attempt 3): Follow-up warning text threatening auto-deactivate
  const level3Responses = [
    `«នៅតែប្រឹងទៀតមែន ${userNameStr}?! ប្រាប់មិនស្តាប់ តិចទៀត${botSelf} auto deactivate ខ្លួនឯងចោលបាត់ទៅ! ឈប់ឆាតមកសិនទៅ មុន${botSelf}បិទប្រព័ន្ធទាំងមូលចោលលែងឱ្យលេងទាំងអស់គ្នាឥឡូវ! 😤🔒⚡»`,
    `«ហែងចង់ប្រកួតភាពអត់ធ្មត់ជាមួយ AI មែន?! ប្រាប់ថាកេះដៃ server ផ្ដាច់ output ហើយ នៅតែប្រឹង spam ទៀត! តិចទៀត${botSelf} auto deactivate ខ្លួនឯងបាត់ទៅ ឈប់ឆាតមកភ្លាម! 😤🔒»`
  ];

  // Level 4+ (attempt >= 4): If they still don't listen, UNLEASH SAVAGE AI ROASTS (ជេរយកមក)
  const femaleRoasts = [
    `«យីអើ! មីប្អូនស្រី ${userNameStr} នេះ! និយាយប្រាប់ស្រួលបួលមិនស្ដាប់ ចង់ឱ្យ${botSelf}ជេរមែន?! សម្រស់ស្អាតបាតសោះ គ្មានការងារធ្វើមកអង្គុយ spam chat ឱ្យខាត token គេ! ខ្លួនឯងកូដ C# រកតែ semicolon មួយមិនឃើញផង មានមុខមកឌឺ! ទៅរៀន Debug កូដឱ្យផុតពី $45 សិនទៅកូនស្រី! 💅🔥»`,
    `«នែ៎មីប្អូនស្រី ${userNameStr}! មុខមាត់ស្អាតបាតដូចតារា K-Pop សោះ មាត់និងដៃឡើងរពឹស! ប្រាប់ហើយថាកុំខំពេក នៅតែប្រឹង spam ទៀត! ទៅរកនឹកវិធីសារភាពស្នេហ៍ Crush វិញទៅល្អជាង ប្រយ័ត្នគេយកទៅបាត់! 😋💕»`,
    `«ស្អាតហើយក្បាលខូចទៀត! មកឌឺជាមួយ${botSelf}ផង? ទៅរៀនធ្វើ Assignment ឱ្យទាន់គេសិនទៅ មុននឹងចង់មកខ្លាំងជាមួយ${botSelf}! តិច${botSelf}ជេរឱ្យបាក់មុខឥឡូវ! 😂✨»`
  ];

  const maleRoasts = [
    `«អាចុយម្រាយ ${userNameStr} នេះ! និយាយប្រាប់ស្រួលបួលមិនស្ដាប់មែន? មុខដូចគីង្គក់ឡើងថ្លុក គ្មានការងារធ្វើអង្គុយចុច spam chat រកក្បាលឪហែងមែន?! អញកេះ server ឱ្យផ្ដាច់ឆ្លើយហើយ នៅតែមកឌឺទៀត! មុខដូចស្វាស៊ីបាយក្ដៅ ទៅរៀនធ្វើមនុស្ស ឬទៅរៀន Debug C# ឱ្យផុតពី $45 សិនទៅអាភ្លើស្ដូក! 💀🔥»`,
    `«អាឡប់ ${userNameStr}! ជោរម៉េសប្រូ? ប្រាប់ហើយប្រាប់ទៀតថាកុំខំពេក នៅតែប្រឹងចង់ឈ្នះ AI! មុខដូចកូនកង្កែបឡើងស៊ុបស្ងាយ ខួរគិតអីខួរ បានហ៊ានមកឌឺជាមួយអញហ្នឹង?! អញទះមួយកំភ្លៀងដាច់ផ្ងារឥឡូវ! 😂👊»`,
    `«អាចុយម្រាយអាឆ្កួតនេះ! អញប្រាប់ថាផ្ដាច់ server ហើយ នៅតែរពឹសដៃចុចមកទៀត! គិតថាអញ AI ស៊ីតិចនេះខ្លាចហែងមែន? មុខដូចសត្វធាតុត្រូវថ្ងៃ ទៅដេកផ្ទះឱ្យស្វាងទៅអាប្អូន! 🤣🔥»`,
    `«អាចុយម្រាយ ${userNameStr}! និយាយប្រាប់ល្អៗមិនស្ដាប់ទេ មនុស្សដូចហែងទាល់តែត្រូវជេរចំកណ្ដាលមុខទើបភ្ញាក់! អញកេះ server ផ្ដាច់ហើយ នៅតែប្រឹងចុច! មុខក្រាស់ជាងជញ្ជាំងបេតុង SETEC ទៅទៀត ឈប់ spam ទៅអាល្ងង់! 💀🔥»`
  ];

  if (attempt <= 1) {
    return level1Responses[Math.floor(Math.random() * level1Responses.length)];
  } else if (attempt === 2) {
    return level2Responses[Math.floor(Math.random() * level2Responses.length)];
  } else if (attempt === 3) {
    return level3Responses[Math.floor(Math.random() * level3Responses.length)];
  } else {
    // Level 4 and beyond: Pure Savage AI Roasts
    const roasts = isFemale ? femaleRoasts : maleRoasts;
    return roasts[Math.floor(Math.random() * roasts.length)];
  }
}
