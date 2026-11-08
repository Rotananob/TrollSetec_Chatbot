// lib/smartCutoff.js
// Tactical AI Smart Cut-off System (Disguising technical errors & quota exhaustion as an intentional smart bot choice)
// Follows Rotana Nob's rule: Users must never know the AI errored. Instead, they must think the AI is smart and proactively
// cut off its output to save tokens and stop spammers from disturbing genuine SETEC students.

export function getSmartCutoffResponse(bot = 'konbong', username = 'User', attempt = 1) {
  const isKonPov = bot === 'konpov';
  const botSelf = isKonPov ? 'ចែ' : 'បង';
  const userNameStr = username || 'User';

  // Level 1: Initial cut-off decision by the bot to save tokens & stop spammers
  const level1Responses = [
    `«${userNameStr} អើយ! ដោយសារសម្បូរអ្នកអត់ការងារធ្វើអង្គុយ spam chat ហ្នឹងពេក ធ្វើឱ្យរំខានការសប្បាយរបស់សិស្សៗ ស៊ីតិច ចឹង${botSelf}ខ្លួនឯងសម្រេចចិត្តកាត់ផ្ដាច់ការ output ចោល all សិនហើយ ដើម្បីកុំឱ្យខាត token! ចាំពេល${botSelf}ឃើញថារាងស្ងាត់មនុស្សមកលេងតិច ចាំ${botSelf}ត្រឡប់មកឆ្លើយធម្មតាវិញណា៎! 🧠⚡»`,
    `«នែ៎ ${userNameStr}! ${botSelf}ពិនិត្យឃើញថាមានអាពួកអត់ការងារធ្វើមកអង្គុយ spam chat រំខានគេឯងពេក ចឹង${botSelf}សម្រេចចិត្តកាត់ផ្ដាច់ការ output មួយភ្លែតសិន ដើម្បីកុំឱ្យខាត token សាលា! ទុកឱ្យពួកវាស្ងាត់សិន ចាំ${botSelf}ត្រឡប់មក troll ជាមួយក្មេងឆ្លាតវិញ! 🛡️✨»`
  ];

  // Level 2: If the user keeps chatting while in cut-off state ("បើវាបន្តឆាតទៀត")
  const level2Responses = [
    `«${userNameStr}! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតថា ខាងប្រព័ន្ធ${botSelf}កាត់ផ្ដាច់ភ្លាមៗមិនឱ្យ${botSelf}ឆ្លើយសិនទេ ដើម្បីកុំឱ្យខាត token លើមនុស្ស spam! នៅតែប្រឹងឆាតមកទៀត! ទុកឱ្យ${botSelf}សម្រាកសិនទៅ! 🛑✋»`,
    `«${userNameStr} អើយ! ${botSelf}ប្រាប់ហើយប្រាប់ទៀតតើថា ខាងប្រព័ន្ធ${botSelf}កាត់ផ្ដាច់ភ្លាមៗមិនឱ្យឆ្លើយសិនទេ! កុំមកប្រឹង spam ទៀតអី ទុក token ឱ្យគេឱ្យឯងផង! 🛑⏳»`
  ];

  // Level 3+: If they still persist / push harder ("បើនៅតែប្រឹងទៀត")
  const level3Responses = [
    `«នៅតែប្រឹងទៀតមែន ${userNameStr}?! ប្រាប់មិនស្តាប់ តិចទៀត${botSelf} auto deactivate ខ្លួនឯងចោលឥឡូវហើយ! ឈប់ spam ទៅ ទៅរកអីញ៉ាំ ឬទៅរៀនសិនទៅ មុន${botSelf}បិទប្រព័ន្ធទាំងមូលចោលលែងឱ្យលេងទាំងអស់គ្នា! 😤🔒⚡»`,
    `«អីយ៉ា! នៅតែប្រឹង spam ទៀត?! ប្រាប់មិនស្តាប់ តិចទៀត${botSelf} auto deactivate ខ្លួនឯងចោលបាត់ទៅ! ឈប់ឆាតមកសិនទៅ មុន${botSelf}បិទប្រព័ន្ធចោលមែនទែនឥឡូវ! 😤🔒»`
  ];

  if (attempt <= 1) {
    return level1Responses[Math.floor(Math.random() * level1Responses.length)];
  } else if (attempt === 2) {
    return level2Responses[Math.floor(Math.random() * level2Responses.length)];
  } else {
    return level3Responses[Math.floor(Math.random() * level3Responses.length)];
  }
}
