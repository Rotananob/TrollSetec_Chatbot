// SETEC Lore, Slang Knowledge Base, and Community Training Data Registry
// This file serves as the extensible continuous training repository for Troll SETEC Chatbot.
// In production, user contributions and new lore are appended here continuously.

export const SETEC_FOUNDATION_LORE = `
ចំណេះដឹង & បរិបទស៊ីជម្រៅអំពីវិទ្យាស្ថាន ស៊ីតិច (SETEC INSTITUTE LORE & CULTURE):
1. ទីតាំង & បរិយាកាសទូទៅ៖
   - វិទ្យាស្ថាន ស៊ីតិច (SETEC Institute) ស្ថិតនៅម្ដុំទួលគោក/ទឹកល្អក់ រាជធានីភ្នំពេញ។
   - មានអគារធំទូលាយ ជណ្ដើរយន្តឡើងទៅថ្នាក់រៀន ជណ្ដើរយន្តជួនកាលស្ទះមនុស្សកកស្ទះម៉ោងចូលរៀន។
   - កន្លែងញ៉ាំបាយ និងកាហ្វេជុំវិញសាលា: ហាងកាហ្វេជុំវិញ SETEC, ហាងបាយមាន់, ហាងគុយទាវ, ហាងកាហ្វេម៉ាត ដែលនិស្សិតតែងជួបជុំគ្នាធ្វើ Assignment ឬត្អូញត្អែររឿងស្មុគស្មាញ។
   - សត្វឆ្មាក្នុងសាលា: ឆ្មាដើរកាត់បន្ទប់រៀន ឆ្មាដើរក្បែរបណ្ណាល័យ ដែលនិស្សិតតែងថតបង្ហោះ Story។

2. ជំនាញសិក្សា & ទុក្ខលំបាកនិស្សិត (FACULTIES & STUDENT STRUGGLES):
   - IT & Software Engineering: កូដ Error មួយបន្ទាត់ រក bug ឡើងក្រហមភ្នែក, C++, Java, Web Development (HTML/CSS/JS, React, Node, Next.js), Python, Database SQL, Networking (Cisco, Packet Tracer)។
   - Graphic Design & Multimedia: Photoshop គាំងមិនទាន់ Save, Illustrator crash, After Effects render ឆេះម៉ាស៊ីន, deadline យប់ជ្រៅ, គ្រូឱ្យកែ Logo មួយរយជុំ។
   - Interior & Architectural Design: គូរប្លង់ AutoCAD, 3ds Max, SketchUp, rendering ឆ្លងយប់, ធ្វើ model កាត់ក្រដាសកាតុងស្អិតដៃ។
   - MIS & BIT: Business IT, Presentations, System Analysis, សរសេរ Report ឡើងក្អួតឈាម។

3. វប្បធម៌ & រឿងកំប្លែងនិស្សិត (STUDENT MEMES & SLANG):
   - "សិស្សច្បងបោក": ពាក្យដែលក្មេងៗឆ្នាំទី១ ចូលចិត្តត្អូញថាសិស្សច្បងប្រាប់ថា "រៀនស៊ីតិចស្រួលតើ គ្មានអីពិបាកទេ" ដល់ចូលរៀនមែនទែន Assignment គរដូចភ្នំ!
   - "Re-exam": ការប្រឡងសងដែលគ្រប់គ្នាចង់ចៀសវាង។ បើធ្លាក់ត្រូវបង់លុយប្រឡងសង ឬរៀនត្រួតថ្នាក់។
   - "Crush មិនតប": ទៅអង្គុយចាំ Crush នៅមុខសាលា ឬក្នុងបណ្ណាល័យ តែ Crush ដើរកាត់មិនទាំងខ្ចីមើលមុខ។
   - "Ot Luy / អត់លុយ": ចុងខែហូបមីកញ្ចប់ ផឹកទឹកក្ដៅសាលា។
   - "សិស្សឆ្នើមលួចគេង": អង្គុយក្រោយគេក្នុងថ្នាក់ធ្វើមុខស្ដាប់ តែតាមពិតភ្នែកបិទជិត។
`;

// Extensible registry for user contributions during production
export const COMMUNITY_CONTRIBUTIONS = [
  {
    topic: 'កន្លែងញ៉ាំបាយសាលា',
    fact: 'បាយមាន់ចៀន និងកាហ្វេដោះគោទឹកកកមុខសាលា ជាអាហារសង្គ្រោះជីវិតពេល Assignment គាំង'
  },
  {
    topic: 'ជណ្ដើរយន្ត SETEC',
    fact: 'ម៉ោង ៧:៥៥ ព្រឹក ជណ្ដើរយន្តស្ទះដូចផ្សារណាត់ បើឡើងជណ្ដើរជើងឡើងដល់ជាន់ទី៥ បែកញើសដូចងូតទឹក'
  },
  {
    topic: 'បន្ទប់កុំព្យូទ័រ Lab',
    fact: 'កុំព្យូទ័រ Lab មួយចំនួន keyboard ជ្រុះអក្សរ ឬ mouse មិនសូវដើរ តែនិស្សិតនៅតែ fight កូដបាន'
  }
];

export function getFullCommunityLoreText() {
  let text = SETEC_FOUNDATION_LORE;
  if (COMMUNITY_CONTRIBUTIONS.length > 0) {
    text += '\n\nចំណេះដឹងបន្ថែមពីសហគមន៍ (COMMUNITY CONTRIBUTED LORE):\n';
    COMMUNITY_CONTRIBUTIONS.forEach((item, idx) => {
      text += `${idx + 1}. [${item.topic}]: ${item.fact}\n`;
    });
  }
  return text;
}
