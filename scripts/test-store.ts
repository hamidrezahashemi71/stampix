// Store logic tests. Run: npm run test:store
declare const process: { exit(code: number): never };
import { useStore, stampsOf, categoryStats } from '../src/store';
const S = () => useStore.getState();
const assert = (c: any, m: string) => { if (!c) { console.error('FAIL', m); process.exit(1); } else console.log('ok ', m); };
const commute = S().categories.find(c=>c.name==='commute')!;
// free stamp
const a = S().stamp(); assert(S().activeSessionId && a.label==='cp1', 'free stamp opens session');
S().stamp(); assert(stampsOf(S().stamps, S().activeSessionId!).length===2, 'second free stamp');
// start commute closes free one
const b = S().startSession(commute.id);
assert(b.label==='leave home', 'commute first cp label');
assert(S().sessions.filter(s=>s.closedAt===null).length===1, 'previous session closed');
for (let i=0;i<3;i++) S().stamp();
const last = S().stamp(); assert(last.label==='arrive work' && S().activeSessionId===null, 'auto-close on last checkpoint');
S().undoStamp(last.id); assert(S().activeSessionId===b.sessionId, 'undo reopens session');
S().stamp(); assert(S().activeSessionId===null, 'closed again');
const st = categoryStats(commute.id, S().sessions, S().stamps, S().categories); assert(st.n===1, 'stats counts complete session');
// stale close
S().startSession(null); S().closeStale(Date.now()+5*3600e3); assert(S().activeSessionId===null, 'stale session closed');
// move stamps
const free = S().sessions.find(s=>s.categoryId===null)!; const ids = stampsOf(S().stamps, free.id).map(x=>x.id);
const tgt = S().moveStamps(ids.slice(0,1), { newCategoryId: commute.id });
assert(stampsOf(S().stamps, tgt).length===1, 'move to new session');
// undo first stamp removes session
const n = S().sessions.length; const c = S().startSession(null); S().undoStamp(c.id); assert(S().sessions.length===n && !S().activeSessionId, 'undo only stamp removes session');
console.log('ALL PASS');
