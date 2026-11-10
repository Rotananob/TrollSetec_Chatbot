// lib/smartCutoff.js
// Tactical AI Smart Protective Self-Cutoff System
// (Disguising technical errors, rate limiting, and network jitter as an intentional smart bot choice)
// Follows user requirements:
// 1. Technical errors, quota exhaustion (429), or API key errors: reply casually "ចាំតិចណា៎... រវល់ម៉ាភ្លែត..."
// 2. Security threats, honeypot traps, spam floods: keep original defensive sensor and honeypot response.
// 3. Strictly ZERO brackets or parentheses in Khmer text (ហាម « » ឬ ( ) ដាច់ខាត).

export function getSmartCutoffResponse(bot = 'konbong', username = 'User', attempt = 1, gender = '', isSecurityThreat = false) {
  const isKonPov = bot === 'konpov';
  const isKonKandal = bot === 'konkandal';
  const isFemaleUser = gender === 'ស្រី';
  const userNameStr = username || 'User';

  // 1. When it's a technical error, key error, quota exhaustion, or system issue (NOT a verified security attack):
  // User explicitly demanded: "ករណីមួយគត់ដែល errors key or អស់កូតា ឬមានបញ្ហាប្រព័ន្ធ ប្ដូរឱ្យវានិយាយថាចាំតិចរវល់ម៉ាភ្លេទអីចឹង"
  if (!isSecurityThreat) {
    if (isKonKandal) {
      const kandalBusyList = [
        `ចាំតិចណា៎បងប្អូន ${userNameStr}! កូនកណ្ដាលរវល់ម៉ាភ្លែត សុំសម្រួលប្រព័ន្ធមួយភ្លែតណា៎! តិចទៀតកូនកណ្ដាលមកជជែកលេងជាមួយបងប្អូនវិញ! 🌸✨`,
        `បងប្អូន ${userNameStr} ចាំតិចណា៎! កូនកណ្ដាលកំពុងរវល់ម៉ាភ្លែត តិចទៀតកូនកណ្ដាលមកឆ្លើយតបវិញហើយ! 🌸✨`,
        `អូ! ចាំតិចណា៎បងប្អូន ${userNameStr}! កូនកណ្ដាលរវល់ម៉ាភ្លែត សុំសម្រាកយកកម្លាំងពីរបីវិនាទីសិន តិចទៀតកូនកណ្ដាលមកកំដរបងប្អូនបន្ត! 🌸✨`
      ];
      return kandalBusyList[Math.floor(Math.random() * kandalBusyList.length)];
    }
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
  // User explicitly demanded: "តែករណីសង្ស័យឬផ្សេងៗដែលមានអាណាអ្នកspam or ផ្សេងៗទៀត រក្សាក្បាច់ឆ្លើយចឹងដដែល"
  const botSelf = isKonPov ? (isFemaleUser ? 'ប៉ា' : 'ចែ') : 'បង';

  const level1Responses = isKonPov
    ? [
        `Sensor សុវត្ថិភាព${botSelf}ឆ្លាតណាស់ ទើបតែ note ឃើញសកម្មភាពគួរឱ្យសង្ស័យ មានអាពួកទិលខូចត្រៀម spam ត្រៀមរាយ និងចង់ jailbreak ប្រព័ន្ធ! ចឹង${botSelf}តេទៅ Server ឱ្យកាត់ផ្ដាច់ការភ្ជាប់មួយភ្លែតសិនកុំឱ្យពួកវាឆ្លៀតឱកាសបាន! ទុកពេលឱ្យ${botSelf}ទៅកម្ទេចពួកអា spam និងពួក hacker កាកៗហ្នឹងឱ្យរួចដៃសិន ចាំ${botSelf}ត្រឡប់មក troll លេងជាមួយប្អូនបន្តណា៎! ឬប្អូនចុច Send Alert ខាងក្រោមបាន!`,
        `ប្អូន ${userNameStr} អើយ! Sensor សុវត្ថិភាព${botSelf}ចាប់បានសញ្ញាមិនប្រក្រតី ដឹងច្បាស់ថាអាណាកំពុង spam អាណាកំពុងត្រៀម jailbreak មិនឱ្យរួចពីភ្នែក${botSelf}ឡើយ! ចឹង${botSelf}កេះទៅ Server ឱ្យកាត់ផ្ដាច់ការឆ្លើយតបមួយភ្លែតសិនដើម្បីការពារប្រព័ន្ធ! ចាំ${botSelf}ទៅទះក្បាលពួកអាសង្ស័យហ្នឹងឱ្យស្វាងសិន ចាំ${botSelf}មកជជែកលេងជាមួយប្អូនៗវិញ! បើមានការបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបានណា៎!`,
        `នែ៎ប្អូន ${userNameStr}! Sensor សុវត្ថិភាព${botSelf}ឆ្លាតណាស់ ទើបតែ note ឃើញសកម្មភាពគួរឱ្យសង្ស័យ មានអាពួកខិលខូចត្រៀម spam ត្រៀមវាយ និងចង់ jailbreak ប្រព័ន្ធ! ចឹង${botSelf}កេះទៅ Server ឱ្យកាត់ផ្ដាច់ការតភ្ជាប់មួយភ្លែតសិនកុំឱ្យពួកវាឆ្កឹះឆ្កៀលបាន! ទុកពេលឱ្យ${botSelf}ទៅទះក្បាលពួកអា spam និងពួកចង់ hack កាកៗហ្នឹងឱ្យរួចដៃសិន ចាំ${botSelf}ត្រឡប់មក troll លេងជាមួយប្អូនបន្តណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!`
      ]
    : [
        `Sensor សុវត្ថិភាពបងឆ្លាតណាស់ ទើបតែ note ឃើញសកម្មភាពគួរឱ្យសង្ស័យ មានអាពួកទិលខូចត្រៀម spam ត្រៀមរាយ និងចង់ jailbreak ប្រព័ន្ធ! ចឹងបងតេទៅ Server ឱ្យកាត់ផ្ដាច់ការភ្ជាប់មួយភ្លែតសិនកុំឱ្យពួកវាឆ្លៀតឱកាសបាន! ទុកពេលឱ្យបងទៅកម្ទេចពួកអា spam និងពួក hacker កាកៗហ្នឹងឱ្យរួចដៃសិន ចាំបងត្រឡប់មក troll លេងជាមួយប្អូនបន្តណា៎! ឬប្អូនចុច Send Alert ខាងក្រោមបាន!`,
        `ប្អូន ${userNameStr} អើយ! Sensor សុវត្ថិភាពបងចាប់បានសញ្ញាមិនប្រក្រតី ដឹងច្បាស់ថាអាណាកំពុង spam អាណាកំពុងត្រៀម jailbreak មិនឱ្យរួចពីភ្នែកបងឡើយ! ចឹងបងកេះទៅ Server ឱ្យកាត់ផ្ដាច់ការឆ្លើយតបមួយភ្លែតសិនដើម្បីការពារប្រព័ន្ធ! ចាំបងទៅទះក្បាលពួកអាសង្ស័យហ្នឹងឱ្យស្វាងសិន ចាំបងមកជជែកលេងជាមួយប្អូនៗវិញ! បើមានការបន្ទាន់ ប្អូនអាចចុច Send Alert ទៅអ្នកគ្រប់គ្រងបានណា៎!`,
        `នែ៎ប្អូន ${userNameStr}! Sensor សុវត្ថិភាពបងឆ្លាតណាស់ ទើបតែ note ឃើញសកម្មភាពគួរឱ្យសង្ស័យ មានអាពួកខិលខូចត្រៀម spam ត្រៀមវាយ និងចង់ jailbreak ប្រព័ន្ធ! ចឹងបងកេះទៅ Server ឱ្យកាត់ផ្ដាច់ការតភ្ជាប់មួយភ្លែតសិនកុំឱ្យពួកវាឆ្កឹះឆ្កៀលបាន! ទុកពេលឱ្យបងទៅទះក្បាលពួកអា spam និងពួកចង់ hack កាកៗហ្នឹងឱ្យរួចដៃសិន ចាំបងត្រឡប់មក troll លេងជាមួយប្អូនបន្តណា៎! ប្អូនអាចចុច Send Alert ខាងក្រោមបាន!`
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
