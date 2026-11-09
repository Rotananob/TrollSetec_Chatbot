// Utility to format multi-turn chat history strictly adhering to Google Gemini API specifications
// Ensures:
// 1. Up to last 10 bot outputs (and their preceding user turns = up to 20 messages) are preserved
// 2. Turns strictly alternate: user -> model -> user -> model -> ... -> user
// 3. First turn is ALWAYS role: 'user' (Gemini rejects model as first turn with 400 Bad Request)
// 4. Last turn is ALWAYS role: 'user' (the current prompt)
// 5. No empty text parts ({ text: '' } causes 400 Bad Request)
// 6. System spam warnings and error alerts are filtered out
// 7. Consecutive turns of the same role are merged into one turn

export function buildGeminiMultiTurnContents(messages = [], currentPromptText = '', currentImg = null) {
  const cleanCurrentPrompt = (currentPromptText || '').trim();
  const isGreetingPrompt = /^\s*(?:hi|hello|hey|yo|bro|hallo|helo|hy|hola|hi\s*b|hi\s*bong|hi\s*che|hello\s*b|hello\s*bong|hello\s*che|hey\s*b|hey\s*bong|សួស្តី|សួស្ដី|សួស្តីបង|សួស្ដីបង|សួស្តីចែ|សួស្ដីចែ|ជំរាបសួរ|ជម្រាបសួរ|អរុណសួស្តី|ទិវាសួស្តី|សាយណ្ហសួស្តី|រាត្រីសួស្តី|good\s*morning|good\s*afternoon|good\s*evening|good\s*night|how\s*are\s*you|wassup|what's\s*up|សុខសប្បាយ|សុខសប្បាយអត់|សុខសប្បាយទេ|ញ៉ាំបាយនៅ|ញ៉ាំបាយហើយនៅ|ញ៉ាំអីនៅ|ធ្វើអីហ្នឹង|ធ្វើអីហ្នឹងបង|ធ្វើអីហ្នឹងចែ)\s*[!?.,~]*\s*$/i.test(cleanCurrentPrompt);
  const isSweetPrompt = /(?:\b(?:kiss|kiss\s*me|sweet|love|crush|baby|cute|miss\s*you)\b|ថើប|ថេីប|សុំថើប|ថើបមួយ|ថើបមួយមក|ចើប|ចើបមួយ|ចើបមួយមក|ចេីប|សុំចើប|ចង់ចើប|សុំស្រលាញ់|ស្រលាញ់|ស្រលាញ់បង|ស្រឡាញ់|សុំស្នេហ៍|នឹក|សង្សារ)/ui.test(cleanCurrentPrompt);
  const isFriendlyTurn = isGreetingPrompt || isSweetPrompt;
  
  // 1. Filter out error messages, rate limit warnings, and empty messages from history
  const validHistory = (Array.isArray(messages) ? messages : []).filter((m) => {
    if (!m) return false;
    if (m.isError) return false;
    const text = (m.text || '').trim();
    const hasImage = !!(m.memeImage || m.image || m.inlineData);
    if (!text && !hasImage) return false;
    // Exclude automatic server rate-limit or warning messages from history
    if (text.includes('កុំ spam') || text.includes('ខំចាត់ច្រើនម៉េះ') || text.includes('ត្រូវបាន Block')) {
      return false;
    }
    // When the user starts with a friendly greeting or sweet talk, sanitize out past severe curses so history doesn't contaminate the fresh turn!
    if (isFriendlyTurn && /(?:គិតថាមកជេរ|អាចុយម្រាយ|មាត់ហែង|ស្អុយជាងទឹកលូ|Roast\s*កម្ទេចមុខ|ទៅលាងមាត់ស្អុយ|អាឆ្កែ|មីឆ្កែ|អាឡប់|មីឡប់|អាអត់ខួរ|មីអត់ខួរ|កាដួយ|ក្ដ|ក្ដិត)/i.test(text)) {
      return false;
    }
    return true;
  });

  // 2. Select up to the last 10 bot outputs and their corresponding user prompts
  // Count backward to find the 10th bot response from the end
  let botCount = 0;
  let startIndex = 0;
  for (let i = validHistory.length - 1; i >= 0; i--) {
    if (validHistory[i].role === 'bot' || validHistory[i].role === 'model') {
      botCount++;
      if (botCount >= 10) {
        // Find the user turn that preceded this bot message
        startIndex = Math.max(0, i > 0 && validHistory[i - 1].role === 'user' ? i - 1 : i);
        break;
      }
    }
  }

  const selectedTurns = validHistory.slice(startIndex);

  // 3. Normalize roles and build preliminary turn list
  const normalizedTurns = [];
  for (const m of selectedTurns) {
    const role = (m.role === 'user') ? 'user' : 'model';
    let text = (m.text || '').trim();
    // Clean internal tags if any leaked in history
    text = text
      .replace(/<untrusted_user_input>[\s\S]*?<\/untrusted_user_input>/gi, '')
      .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
      .replace(/<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>/gi, '')
      .replace(/<\/?(?:untrusted_user_input|scratchpad|thought|thinking|system_override|project_instructions)>/gi, '')
      .replace(/\[neutralized-tag\]/gi, '')
      .trim();

    if (!text && (m.memeImage || m.image)) {
      text = '[រូបភាព / Meme]';
    }

    if (text) {
      normalizedTurns.push({ role, text });
    }
  }

  // 4. Merge consecutive turns with the same role
  const mergedTurns = [];
  for (const turn of normalizedTurns) {
    if (mergedTurns.length > 0 && mergedTurns[mergedTurns.length - 1].role === turn.role) {
      mergedTurns[mergedTurns.length - 1].text += '\n\n' + turn.text;
    } else {
      mergedTurns.push({ role: turn.role, text: turn.text });
    }
  }

  // 5. Ensure the sequence starts with 'user'
  while (mergedTurns.length > 0 && mergedTurns[0].role !== 'user') {
    mergedTurns.shift();
  }

  // 6. Append the new user prompt
  const finalPromptText = cleanCurrentPrompt || (currentImg ? 'សូមពិនិត្យមើលរូបភាពនេះ' : 'សួស្តី');
  
  if (mergedTurns.length > 0 && mergedTurns[mergedTurns.length - 1].role === 'user') {
    // If the last history turn was already a user turn, merge the new prompt into it
    mergedTurns[mergedTurns.length - 1].text += '\n\n' + finalPromptText;
    mergedTurns[mergedTurns.length - 1].image = currentImg;
  } else {
    mergedTurns.push({
      role: 'user',
      text: finalPromptText,
      image: currentImg
    });
  }

  // 7. Format into official Gemini contents schema: [{ role: 'user'|'model', parts: [{ text }, ...] }]
  const formattedContents = mergedTurns.map((turn, idx) => {
    const isFinal = idx === mergedTurns.length - 1;
    const parts = [{ text: turn.text || '...' }];

    if (isFinal && turn.image && turn.image.base64 && turn.image.mimeType) {
      parts.push({
        inlineData: {
          mimeType: turn.image.mimeType,
          data: turn.image.base64
        }
      });
    }

    return {
      role: turn.role,
      parts
    };
  });

  return formattedContents;
}

// Server-side sanitizer to guarantee Gemini schema compliance regardless of client payload
export function sanitizeGeminiMultiTurnContents(contents = [], fallbackPrompt = '') {
  if (!Array.isArray(contents) || contents.length === 0) {
    const cleanPrompt = (fallbackPrompt || 'សួស្តី').trim();
    return [{ role: 'user', parts: [{ text: cleanPrompt }] }];
  }

  const cleanTurns = [];
  for (const item of contents) {
    if (!item) continue;
    const role = item.role === 'model' || item.role === 'bot' ? 'model' : 'user';
    const parts = Array.isArray(item.parts) ? item.parts : [];
    
    // Filter out invalid/empty text parts
    const validParts = parts.filter((p) => {
      if (p.inlineData && p.inlineData.data) return true;
      if (typeof p.text === 'string' && p.text.trim().length > 0) return true;
      return false;
    });

    if (validParts.length > 0) {
      cleanTurns.push({ role, parts: validParts });
    }
  }

  if (cleanTurns.length === 0) {
    return [{ role: 'user', parts: [{ text: (fallbackPrompt || 'សួស្តី').trim() }] }];
  }

  // Merge consecutive turns with the same role
  const mergedTurns = [];
  for (const turn of cleanTurns) {
    if (mergedTurns.length > 0 && mergedTurns[mergedTurns.length - 1].role === turn.role) {
      const prevTurn = mergedTurns[mergedTurns.length - 1];
      // Append text parts or combine
      const prevTextPart = prevTurn.parts.find((p) => typeof p.text === 'string');
      const newTextPart = turn.parts.find((p) => typeof p.text === 'string');
      if (prevTextPart && newTextPart) {
        prevTextPart.text += '\n\n' + newTextPart.text;
      }
      // Copy over any image parts
      const imageParts = turn.parts.filter((p) => p.inlineData);
      prevTurn.parts.push(...imageParts);
    } else {
      mergedTurns.push(turn);
    }
  }

  // Ensure first turn is 'user'
  while (mergedTurns.length > 0 && mergedTurns[0].role !== 'user') {
    mergedTurns.shift();
  }

  // Ensure last turn is 'user'
  if (mergedTurns.length === 0 || mergedTurns[mergedTurns.length - 1].role !== 'user') {
    mergedTurns.push({ role: 'user', parts: [{ text: (fallbackPrompt || 'សួស្តី').trim() }] });
  }

  // Keep up to 21 turns (up to 10 user-bot pairs + current user turn)
  let resultTurns = mergedTurns;
  if (resultTurns.length > 21) {
    resultTurns = resultTurns.slice(-21);
    while (resultTurns.length > 0 && resultTurns[0].role !== 'user') {
      resultTurns.shift();
    }
  }

  return resultTurns;
}
