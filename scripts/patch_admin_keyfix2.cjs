// scripts/patch_admin_keyfix2.cjs
// Patches 2, 3, 4 for the admin page (patch 1 already applied)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'app', 'jam-tic-kapea-1-sin', 'page.js');
let content = fs.readFileSync(FILE, 'utf8');

// ============================================================
// PATCH 2: Wrap the header buttons in flex div and add "Test All" button
// ============================================================
const P2_OLD = `                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-key text-amber-400" />
                    <span>សុខភាព Gemini API Keys</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => fetchState()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>`;

const P2_NEW = `                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-key text-amber-400" />
                    <span>សុខភាព Gemini API Keys</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTestAllKeys}
                      disabled={isFixingAi}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFixingAi ? '...' : 'Test All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchState()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>
                </div>`;

if (content.includes('Test All') && content.includes('handleTestAllKeys')) {
  console.log('SKIP patch 2 — Test All button already present');
} else {
  if (!content.includes(P2_OLD)) {
    console.error('ERROR: anchor not found for patch 2');
    const idx = content.indexOf('fa-solid fa-key');
    console.log('context around key icon:', JSON.stringify(content.substring(idx-50, idx+400)));
    process.exit(1);
  }
  content = content.replace(P2_OLD, P2_NEW);
  console.log('OK patch 2 — Test All button added');
}

// ============================================================
// PATCH 3: Replace per-key row to add Fix + Test buttons + ping result
// ============================================================
const P3_OLD = `                    aiEngineHealth.keyHealth.map((k) => (
                      <div
                        key={k.index}
                        className={\`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 \${
                          k.coolingDown
                            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                            : 'bg-slate-950/70 border-slate-800 text-slate-200'
                        }\`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{k.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{k.masked}</div>
                        </div>
                        <span
                          className={\`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 \${
                            k.coolingDown
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }\`}
                        >
                          {k.coolingDown ? \`\${k.remainingSec}s\` : 'OK'}
                        </span>
                      </div>
                    ))`;

const P3_NEW = `                    aiEngineHealth.keyHealth.map((k) => {
                      const testRes = keyTestResults[k.index];
                      return (
                        <div
                          key={k.index}
                          className={\`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 \${
                            k.coolingDown
                              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                              : 'bg-slate-950/70 border-slate-800 text-slate-200'
                          }\`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{k.label}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{k.masked}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                  k.coolingDown
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }\`}
                              >
                                {k.coolingDown ? \`\${k.remainingSec}s\` : 'OK'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTestSingleKey(k.index)}
                                disabled={testingKeyIndex === k.index || fixingKeyIndex === k.index}
                                className="px-1.5 py-0.5 rounded-md bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 text-[10px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={\`Ping Key #\${k.index}\`}
                              >
                                {testingKeyIndex === k.index ? '...' : 'Test'}
                              </button>
                              {k.coolingDown && (
                                <button
                                  type="button"
                                  onClick={() => handleFixSingleKey(k.index)}
                                  disabled={fixingKeyIndex === k.index || testingKeyIndex === k.index}
                                  className="px-1.5 py-0.5 rounded-md bg-amber-800/70 hover:bg-amber-700 text-amber-200 text-[10px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={\`Fix Key #\${k.index} cooldown\`}
                                >
                                  {fixingKeyIndex === k.index ? '...' : 'Fix'}
                                </button>
                              )}
                            </div>
                          </div>
                          {testRes && (
                            <div className={\`text-[10px] font-mono px-2 py-1 rounded-lg \${testRes.ok ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'}\`}>
                              {testRes.ok
                                ? \`Ping OK — \${testRes.latencyMs}ms\`
                                : \`Ping FAIL — \${testRes.error || 'timeout'}\`}
                            </div>
                          )}
                        </div>
                      );
                    })`;

if (content.includes('handleTestSingleKey(k.index)')) {
  console.log('SKIP patch 3 — per-key Test button already present');
} else {
  if (!content.includes(P3_OLD)) {
    console.error('ERROR: anchor not found for patch 3');
    const idx = content.indexOf('aiEngineHealth.keyHealth.map');
    console.log('map context:', JSON.stringify(content.substring(idx, idx+500)));
    process.exit(1);
  }
  content = content.replace(P3_OLD, P3_NEW);
  console.log('OK patch 3 — per-key Fix+Test buttons added');
}

// ============================================================
// PATCH 4: Add Root Cause Diagnostics panel
// ============================================================
const P4_OLD = `                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>TTS Cooldown Slots</span>
                  <span className="font-mono text-slate-200">{aiEngineHealth?.ttsCoolingCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}`;

const P4_NEW = `                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>TTS Cooldown Slots</span>
                  <span className="font-mono text-slate-200">{aiEngineHealth?.ttsCoolingCount ?? 0}</span>
                </div>
              </div>

              {/* ── Root Cause Auto-Diagnostics Panel ── */}
              {aiIncidents.length > 0 && (() => {
                const hasEmptyStream = aiIncidents.some(inc => inc?.reason?.includes('empty') || inc?.reason?.includes('stream') || inc?.type === 'empty_stream');
                const has429 = aiIncidents.some(inc => inc?.reason?.includes('429') || inc?.reason?.includes('quota') || inc?.type === 'key_exhausted');
                const hasTimeout = aiIncidents.some(inc => inc?.reason?.includes('timeout') || inc?.reason?.includes('DEADLINE'));
                const hasSessionLock = aiIncidents.some(inc => inc?.reason?.includes('session') || inc?.reason?.includes('cooldown') || inc?.type === 'rate_limit');
                const patterns = [];
                if (hasEmptyStream) patterns.push({ id: 'stream', label: 'Stream ទទេ (Empty Response)', desc: 'Gemini Stream ត្រឡប់ HTTP 200 ប៉ុន្តែគ្មានអក្សរ — bot ក្ដៅ ឬ Prompt ស្ទះ', btnLabel: 'Fix AI Engine' });
                if (has429) patterns.push({ id: '429', label: 'API Key Quota 429', desc: 'Key ជួប Rate Limit ។ ចុច Fix All Keys ដើម្បីដោះ Cooldown', btnLabel: 'Fix All Keys' });
                if (hasTimeout) patterns.push({ id: 'timeout', label: 'Network Timeout', desc: 'ការទំនាក់ទំនងជាប់ lag ។ Vercel Serverless អាចដោះដោយ Restart', btnLabel: 'Restart AI Engine' });
                if (hasSessionLock) patterns.push({ id: 'session', label: 'Session Rate Lock', desc: 'User ជាប់ 10/30 min cooldown ។ ចុច Fix ដើម្បីដោះ lock ភ្លាមៗ', btnLabel: 'Clear Rate Limits' });
                if (patterns.length === 0) return null;
                return (
                  <div className="bg-slate-900/80 border border-amber-800/40 rounded-2xl p-5 shadow-xl space-y-3 mt-2">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <i className="fa-solid fa-magnifying-glass" />
                      ការវិភាគស្វ័យប្រវត្តិ — ហេតុផលនៃ Error
                    </h3>
                    <div className="space-y-2">
                      {patterns.map(p => (
                        <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white">{p.label}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                          </div>
                          <button
                            type="button"
                            onClick={handleFixAiEngine}
                            disabled={isFixingAi}
                            className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-700/70 hover:bg-amber-600 text-amber-100 text-[10px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isFixingAi ? '...' : p.btnLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}`;

if (content.includes('ការវិភាគស្វ័យប្រវត្តិ')) {
  console.log('SKIP patch 4 — diagnostics panel already present');
} else {
  if (!content.includes(P4_OLD)) {
    console.error('ERROR: anchor not found for patch 4');
    const idx = content.indexOf('TTS Cooldown Slots');
    console.log('TTS context:', JSON.stringify(content.substring(idx-100, idx+400)));
    process.exit(1);
  }
  content = content.replace(P4_OLD, P4_NEW);
  console.log('OK patch 4 — Root Cause Diagnostics panel added');
}

fs.writeFileSync(FILE, content, 'utf8');
console.log('Done. All patches applied successfully.');
