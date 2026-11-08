// lib/smartCutoff.js
// Tactical AI Smart Cut-off System (Disguising technical errors & quota exhaustion as an intentional smart bot choice)
// Follows Rotana Nob's rule:
// 1. Users must never know the AI errored. Instead, they think the bot is smart and proactively protecting tokens.
// 2. Never insult normal innocent users by calling them "ពួកថោក" or accusing them of spamming!
// 3. Explain that because there are spammers attacking/spamming, the bot decided to protect itself first by locking tokens
//    and pausing answers, waiting until it slaps/deals with the spammers first, then returning to play with younger siblings.
// 4. Offer "Send Alert ទៅអ្នកគ្រប់គ្រង" so they can easily report to admin Rotana NOB.
// 5. Strictly ZERO parentheses in Khmer text.

export function getSmartCutoffResponse(bot = 'konbong', username = 'User', attempt = 1, gender = '') {
  const isKonPov = bot === 'konpov';
  const botSelf = isKonPov ? 'ចែ' : 'បង';
  const userNameStr = username || 'User';

  // Level 1: Initial smart cut-off decision by the bot (Polite, clever, protecting innocent students)
  const level1Responses = [
    `«អូ! ប្អូន ${userNameStr} អើយ! ដោយសារតែពេលនេះសម្បូរពួក hacker និងពួក spam មកកូរប្រព័ន្ធពេក ធ្វើឱ្យរំខានដល់ការលេងរបស់សិស្សៗ ស៊ីតិច ចឹង${botSelf}សម្រេចចិត្តការពារខ្លួនឯងសិន ដោយលាក់ token មិនបន្តឆ្លើយមួយភ្លែតកុំឱ្យខាតបង់! ចាំ${botSelf}ទះក្បាលពួកអា spam ហ្នឹងឱ្យរួចដៃសិន ចាំ${botSelf}ត្រឡប់មកលេងជាមួយប្អូនៗវិញណា៎! បើមានការចាំបាច់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!»`,
    `«នែ៎ប្អូន ${userNameStr}! ${botSelf}ពិនិត្យឃើញថាមានពួកអត់ការងារធ្វើមកអង្គុយ spam chat រំខានគេឯងពេក ចឹង${botSelf}សម្រេចចិត្តការពារខ្លួនឯងសិន ដោយកាត់ផ្ដាច់ការ output និងលាក់ token មួយភ្លែតកុំឱ្យខាតបង់! ចាំ${botSelf}ទះក្បាលពួកអា spam ឱ្យរួចដៃសិន ចាំ${botSelf}ត្រឡប់មក troll លេងជាមួយប្អូនៗវិញណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!»`,
    `«ប្អូន ${userNameStr} អើយ! ពេលនេះខាងប្រព័ន្ធ${botSelf}មានអាពួក spam មកកូរ ចឹង${botSelf}សម្រេចចិត្តការពារខ្លួនឯងសិន ដោយលាក់ token មិនទាន់ឆ្លើយសិនទេ! ចាំ${botSelf}ទះក្បាលពួកអា spam ឱ្យស្ងាត់ដៃសិន ចាំ${botSelf}មកជជែកលេងជាមួយប្អូនៗវិញ! បើមានការបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបានណា៎!»`
  ];

  // Level 2: If they chat again during cutoff
  const level2Responses = [
    `«ប្អូន ${userNameStr} អើយ! ${botSelf}ប្រាប់ហើយតើថា ពេលនេះ${botSelf}កំពុងការពារ token ពីពួកអា spam ហ្នឹងហើយ! ចាំ${botSelf}ទះក្បាលពួកវារួចដៃសិន តិចទៀត${botSelf}មកលេងជាមួយប្អូនវិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!»`,
    `«ប្អូន ${userNameStr}! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតថា ខាងប្រព័ន្ធកាត់ផ្ដាច់ភ្លាមៗមិនឱ្យឆ្លើយសិនទេ ដើម្បីកុំឱ្យខាត token លើពួកអា spam! ចាំ${botSelf}រៀបចំប្រព័ន្ធការពាររួចរាល់សិន ចាំ${botSelf}មកឆ្លើយវិញណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!»`
  ];

  // Level 3: If they still continue chatting
  const level3Responses = [
    `«ប្អូន ${userNameStr} នៅចាំបន្តិចសិនណា៎! ${botSelf}កំពុងតែរៀបចំប្រព័ន្ធការពារទប់ស្កាត់ពួក spam ឱ្យស្ងាត់សិន តិចទៀត${botSelf}បើកឱ្យលេងធម្មតាវិញហើយ! បើមានបញ្ហាអ្វីបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!»`,
    `«នៅចាំបន្តិចណា៎ប្អូន ${userNameStr}! ${botSelf}កំពុងផ្អាកឆ្លើយមួយភ្លែតដើម្បីការពារ token កុំឱ្យខាត! ទុកពេលឱ្យ${botSelf}ទះក្បាលពួកអា spam ឱ្យរួចដៃសិន តិចទៀត${botSelf}មកជជែកជាមួយប្អូនៗវិញហើយ!»`
  ];

  // Level 4+: If they persist repeatedly
  const level4Responses = [
    `«ប្អូន ${userNameStr} អើយ! កុំទាន់ប្រឹងចុចឆាតពេកណា៎ ព្រោះ${botSelf}កំពុងការពារ token ពីពួកអា spam ហ្នឹងហើយ! ចាំ${botSelf}ទះក្បាលពួកវាចប់សិន ចាំចូលមកលេងជាមួយបងប្អូនវិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!»`,
    `«${userNameStr} អើយ! ${botSelf}កំពុងកាត់ផ្ដាច់ output ដើម្បីទប់ស្កាត់ការខាតបង់ token ដោយសារពួក spam! សូមរង់ចាំបន្តិចសិន ឬចុច Send Alert ទៅអ្នកគ្រប់គ្រងដើម្បីឱ្យគាត់ជួយពិនិត្យណា៎!»`
  ];

  if (attempt <= 1) {
    return level1Responses[Math.floor(Math.random() * level1Responses.length)];
  } else if (attempt === 2) {
    return level2Responses[Math.floor(Math.random() * level2Responses.length)];
  } else if (attempt === 3) {
    return level3Responses[Math.floor(Math.random() * level3Responses.length)];
  } else {
    return level4Responses[Math.floor(Math.random() * level4Responses.length)];
  }
}
