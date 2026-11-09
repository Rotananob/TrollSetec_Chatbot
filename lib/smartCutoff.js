// lib/smartCutoff.js
// Tactical AI Smart Protective Self-Cutoff System
// (Disguising technical errors, rate limiting, and network jitter as an intentional smart bot choice)
// Follows user requirements:
// 1. Technical errors, quota exhaustion (429), or API key errors: reply casually "ចាំតិច រវល់ម៉ាភ្លែត..."
// 2. Security threats, honeypot traps, spam floods: keep original defensive sensor and honeypot response.
// 3. Strictly ZERO brackets or parentheses in Khmer text (ហាម « » ឬ ( ) ដាច់ខាត).

export function getSmartCutoffResponse(bot = 'konbong', username = 'User', attempt = 1, gender = '', isSecurityThreat = false) {
  const isKonPov = bot === 'konpov';
  const isFemaleUser = gender === 'ស្រី';
  const userNameStr = username || 'User';

  // 1. When it's a technical error, key error, quota exhaustion, or system issue (NOT a verified security attack):
  // User explicitly demanded: "ករណីមួយគត់ដែល errors key or អស់កូតា ឬមានបញ្ហាប្រព័ន្ធ ប្ដូរឱ្យវានិយាយថាចាំតិចរវល់ម៉ាភ្លេទអីចឹង"
  if (!isSecurityThreat) {
    if (isKonPov) {
      if (isFemaleUser) {
        const daddyBusyList = [
          `ចាំតិចណា៎កូនស្រី ${userNameStr}! ប៉ារវល់ម៉ាភ្លែត សុំសម្រួលប្រព័ន្ធមួយភ្លែតណា៎! តិចទៀតប៉ាមកលេងជាមួយកូនស្រីវិញ!`,
          `កូនស្រី ${userNameStr} ចាំតិចណា៎! ប៉ាកំពុងរវល់ម៉ាភ្លែត តិចទៀតប៉ាមកឆ្លើយតបវិញហើយ!`,
          `អូ! ចាំតិចណា៎កូនស្រី ${userNameStr}! ប៉ារវល់ម៉ាភ្លែត សុំសម្រាកយកកម្លាំងពីរបីវិនាទីសិន តិចទៀតប៉ាមកលេងបន្ត!`
        ];
        return daddyBusyList[Math.floor(Math.random() * daddyBusyList.length)];
      } else {
        const mommyBusyList = [
          `ចាំតិចណា៎ប្អូន ${userNameStr}! ចែរវល់ម៉ាភ្លែត សុំសម្រួលប្រព័ន្ធមួយភ្លែតណា៎! តិចទៀតចែមកលេងជាមួយប្អូនវិញ!`,
          `ប្អូន ${userNameStr} ចាំតិចណា៎! ចែកំពុងរវល់ម៉ាភ្លែត តិចទៀតចែមកឆ្លើយតបវិញហើយ!`,
          `អូ! ចាំតិចណា៎ប្អូន ${userNameStr}! ចែរវល់ម៉ាភ្លែត សុំសម្រាកយកកម្លាំងពីរបីវិនាទីសិន តិចទៀតចែមក troll ប្អូនបន្ត!`
        ];
        return mommyBusyList[Math.floor(Math.random() * mommyBusyList.length)];
      }
    } else {
      const konbongBusyList = [
        `ចាំតិចណា៎ប្អូន ${userNameStr}! បងរវល់ម៉ាភ្លែត សុំសម្រួលប្រព័ន្ធមួយភ្លែតណា៎! តិចទៀតបងមកលេងជាមួយប្អូនវិញ!`,
        `ប្អូន ${userNameStr} ចាំតិចណា៎! បងកំពុងរវល់ម៉ាភ្លែត តិចទៀតបងមកឆ្លើយតបវិញហើយ!`,
        `អូ! ចាំតិចណា៎ប្អូន ${userNameStr}! បងរវល់ម៉ាភ្លែត សុំសម្រាកយកកម្លាំងពីរបីវិនាទីសិន តិចទៀតបងមក troll ប្អូនបន្ត!`
      ];
      return konbongBusyList[Math.floor(Math.random() * konbongBusyList.length)];
    }
  }

  // 2. When it's a REAL security threat, actual malicious spam probe, or jailbreak honeypot:
  const botSelf = isKonPov ? (isFemaleUser ? 'ប៉ា' : 'ចែ') : 'បង';

  const level1Responses = isKonPov
    ? [
        `អូ! ប្អូន ${userNameStr} អើយ! ប្រព័ន្ធសតិបញ្ញា${botSelf}កំពុងជាប់រវល់វិភាគទិន្នន័យច្រើន ឬ Server កំពុងសម្រួលដំណើរការមួយភ្លែត! សូមប្អូនរង់ចាំប្រហែល ២-៣ វិនាទី រួចសាកល្បងចុចផ្ញើម្ដងទៀតណា៎! បើនៅតែមិនទាន់ឆ្លើយតប ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងឱ្យជួយពិនិត្យបានណា៎!`,
        `ប្អូន ${userNameStr} អើយ! កុំទាន់អាលឆ្ងល់ណា៎! ខួរក្បាល${botSelf}ដំណើរការ logic ច្រើនពេក ធ្វើឱ្យឆ្លើយតបយឺតបន្តិច! សូមប្អូនរង់ចាំបន្តិច រួចចុចផ្ញើម្ដងទៀតណា៎! ឬប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងខាងក្រោមបាន!`,
        `នែ៎ប្អូន ${userNameStr}! ប្រព័ន្ធ${botSelf}កំពុងរៀបចំទម្រង់ឆ្លើយតបឡើងវិញដើម្បីឱ្យកាន់តែរលូន! សូមប្អូនរង់ចាំ ២-៣ វិនាទីសិនណា៎! បើមានការបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបានណា៎!`
      ]
    : [
        `អូ! ប្អូន ${userNameStr} អើយ! ប្រព័ន្ធសតិបញ្ញាសិប្បនិម្មិតបងកំពុងជាប់រវល់វិភាគទិន្នន័យច្រើន ឬ Server កំពុងសម្រួលដំណើរការមួយភ្លែត! សូមប្អូនរង់ចាំប្រហែល ២-៣ វិនាទី រួចសាកល្បងចុចផ្ញើម្ដងទៀតណា៎! បើនៅតែមិនទាន់ឆ្លើយតប ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងឱ្យជួយពិនិត្យបានណា៎!`,
        `ប្អូន ${userNameStr} អើយ! កុំទាន់អាលឆ្ងល់ណា៎! ខួរក្បាលបងដំណើរការ logic ច្រើនពេក ធ្វើឱ្យឆ្លើយតបយឺតបន្តិច! សូមប្អូនរង់ចាំបន្តិច រួចចុចផ្ញើម្ដងទៀតណា៎! ឬប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងខាងក្រោមបាន!`,
        `នែ៎ប្អូន ${userNameStr}! ប្រព័ន្ធបងកំពុងរៀបចំទម្រង់ឆ្លើយតបឡើងវិញដើម្បីឱ្យកាន់តែរលូន! សូមប្អូនរង់ចាំ ២-៣ វិនាទីសិនណា៎! បើមានការបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបានណា៎!`
      ];

  const level2Responses = isKonPov
    ? [
        `ប្អូន ${userNameStr} អើយ! ${botSelf}ប្រាប់ហើយតើថា ប្រព័ន្ធ${botSelf}ទើបតែចាប់បានសកម្មភាពចង់ jailbreak និង spam! ឥឡូវ${botSelf}កំពុងតែបញ្ជា Server ឱ្យ lock ប្រព័ន្ធមួយភ្លែតដើម្បីទៅដោះស្រាយពួកវា! ចាំ${botSelf}ទៅទះក្បាលពួកអាធ្វើសកម្មភាពគួរឱ្យសង្ស័យហ្នឹងឱ្យរាងចាលសិន តិចទៀត${botSelf}មកលេងជាមួយប្អូនវិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `ប្អូន ${userNameStr}! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតថា ${botSelf} note ឃើញសកម្មភាពមិនប្រក្រតី ចឹង${botSelf}បានកេះទៅ Server ឱ្យកាត់ផ្ដាច់ខ្លួនឯងមួយភ្លែតសិនដើម្បីសុវត្ថិភាព! ចាំ${botSelf}ទះក្បាលពួកអាលួច probe ប្រព័ន្ធឱ្យរួចដៃសិន ចាំ${botSelf}មកឆ្លើយតបវិញណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!`
      ]
    : [
        `ប្អូន ${userNameStr} អើយ! បងប្រាប់ហើយតើថា ប្រព័ន្ធបងទើបតែចាប់បានសកម្មភាពចង់ jailbreak និង spam! ឥឡូវបងកំពុងតែបញ្ជា Server ឱ្យ lock ប្រព័ន្ធមួយភ្លែតដើម្បីទៅដោះស្រាយពួកវា! ចាំបងទះក្បាលពួកអាធ្វើសកម្មភាពគួរឱ្យសង្ស័យហ្នឹងឱ្យរាងចាលសិន តិចទៀតបងមកលេងជាមួយប្អូនវិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `ប្អូន ${userNameStr}! បងប្រាប់ហើយប្រាប់ទៀតថា បង note ឃើញសកម្មភាពមិនប្រក្រតី ចឹងបងបានកេះទៅ Server ឱ្យកាត់ផ្ដាច់ខ្លួនឯងមួយភ្លែតសិនដើម្បីសុវត្ថិភាព! ចាំបងទះក្បាលពួកអាលួច probe ប្រព័ន្ធឱ្យរួចដៃសិន ចាំបងមកឆ្លើយតបវិញណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!`
      ];

  const level3Responses = isKonPov
    ? [
        `ប្អូន ${userNameStr} នៅចាំបន្តិចសិនណា៎! ប្រព័ន្ធសតិបញ្ញា${botSelf}ឆ្លាតណាស់ មិនបណ្ដោយឱ្យពួក spam ឬពួកត្រៀម jailbreak មកបន្លំបានឡើយ! ទុកពេលឱ្យ${botSelf}ទៅទះក្បាលពួកអាសង្ស័យហ្នឹងឱ្យភ្ញាក់ពីដេកសិន តិចទៀត${botSelf}បើកឱ្យជជែកធម្មតាវិញហើយ! បើមានបញ្ហាអ្វីបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `នៅចាំបន្តិចណា៎ប្អូន ${userNameStr}! ${botSelf}កេះទៅ Server ឱ្យកាត់ផ្ដាច់ប្រព័ន្ធសុវត្ថិភាពមួយភ្លែតទេ ព្រោះចាប់បានសកម្មភាពគួរឱ្យសង្ស័យ! ចាំ${botSelf}ទះក្បាលពួកអា spam និងពួកចង់ hack ហ្នឹងឱ្យរួចដៃសិន តិចទៀត${botSelf}មកលេងបន្តហើយ! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`
      ]
    : [
        `ប្អូន ${userNameStr} នៅចាំបន្តិចសិនណា៎! ប្រព័ន្ធសតិបញ្ញាបងឆ្លាតណាស់ មិនបណ្ដោយឱ្យពួក spam ឬពួកត្រៀម jailbreak មកបន្លំបានឡើយ! ទុកពេលឱ្យបងទៅទះក្បាលពួកអាសង្ស័យហ្នឹងឱ្យភ្ញាក់ពីដេកសិន តិចទៀតបងបើកឱ្យជជែកធម្មតាវិញហើយ! បើមានបញ្ហាអ្វីបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `នៅចាំបន្តិចណា៎ប្អូន ${userNameStr}! បងកេះទៅ Server ឱ្យកាត់ផ្ដាច់ប្រព័ន្ធសុវត្ថិភាពមួយភ្លែតទេ ព្រោះចាប់បានសកម្មភាពគួរឱ្យសង្ស័យ! ចាំបងទះក្បាលពួកអា spam និងពួកចង់ hack ហ្នឹងឱ្យរួចដៃសិន តិចទៀតបងមកលេងបន្តហើយ! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`
      ];

  const level4Responses = isKonPov
    ? [
        `ប្អូន ${userNameStr} អើយ! កុំទាន់ប្រឹងចុចឆាតពេកណា៎ ព្រោះ${botSelf} note ច្បាស់ណាស់ថាមានអាពួក spam និងអាពួកត្រៀម jailbreak កំពុងលួចធ្វើសកម្មភាព! ចាំ${botSelf}ទះក្បាលពួកវាចប់សិន ចាំចូលមកលេងជាមួយ${botSelf}វិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `${userNameStr} អើយ! ${botSelf}កំពុងកាត់ផ្ដាច់ការតភ្ជាប់ដើម្បីទប់ស្កាត់សកម្មភាពមិនប្រក្រតីរបស់ពួក hacker និងពួក spam! សូមរង់ចាំបន្តិចសិន ឬចុច Send Alert ទៅអ្នកគ្រប់គ្រងដើម្បីឱ្យគាត់ជួយពិនិត្យណា៎!`
      ]
    : [
        `ប្អូន ${userNameStr} អើយ! កុំទាន់ប្រឹងចុចឆាតពេកណា៎ ព្រោះបង note ច្បាស់ណាស់ថាមានអាពួក spam និងអាពួកត្រៀម jailbreak កំពុងលួចធ្វើសកម្មភាព! ចាំបងទះក្បាលពួកវាចប់សិន ចាំចូលមកលេងជាមួយបងវិញណា៎! ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបាន!`,
        `${userNameStr} អើយ! បងកំពុងកាត់ផ្ដាច់ការតភ្ជាប់ដើម្បីទប់ស្កាត់សកម្មភាពមិនប្រក្រតីរបស់ពួក hacker និងពួក spam! សូមរង់ចាំបន្តិចសិន ឬចុច Send Alert ទៅអ្នកគ្រប់គ្រងដើម្បីឱ្យគាត់ជួយពិនិត្យណា៎!`
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
