/**
 * クイズの選択肢を再生成するスクリプト
 * - 部分一致する選択肢を排除
 * - 同じ語幹を持つ単語を排除
 * - 正解と似た長さの単語を優先
 */
const fs = require('fs');

const grades = [
  { key: '5kyu', quiz: 'pass5_quiz.json', wordlist: 'wordlist_5kyu_pass.json' },
  { key: '4kyu', quiz: 'pass4_quiz.json', wordlist: 'wordlist_4kyu_pass.json' },
  { key: '3kyu', quiz: 'pass3_quiz.json', wordlist: 'wordlist_3kyu_pass.json' },
  { key: 'pre2kyu', quiz: 'pass_pre2_quiz.json', wordlist: 'wordlist_pre2kyu_pass.json' },
];

// 2つの選択肢が重複しているか判定
function hasOverlap(a, b) {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return true;
  // 部分文字列チェック（3文字以上の単語のみ）
  if (al.length >= 3 && bl.length >= 3) {
    if (al.includes(bl) || bl.includes(al)) return true;
  }
  // 語幹チェック: 片方が他方の先頭4文字以上を共有
  const minLen = Math.min(al.length, bl.length);
  const stemLen = Math.min(4, minLen);
  if (stemLen >= 4 && al.substring(0, stemLen) === bl.substring(0, stemLen)) {
    // 共通語幹が4文字以上 → 重複とみなす
    return true;
  }
  return false;
}

// 選択肢セット全体の中で重複がないか
function setHasOverlap(choices) {
  for (let i = 0; i < choices.length; i++) {
    for (let j = i + 1; j < choices.length; j++) {
      if (hasOverlap(choices[i], choices[j])) return true;
    }
  }
  return false;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let totalFixed = 0;
let totalQuestions = 0;

for (const g of grades) {
  const quiz = JSON.parse(fs.readFileSync(g.quiz, 'utf8'));
  const wordlist = JSON.parse(fs.readFileSync(g.wordlist, 'utf8'));
  const allWords = wordlist.map(w => w.english);
  
  let fixedCount = 0;

  for (const q of quiz) {
    totalQuestions++;
    const answer = q.answer;
    
    // まず現在の選択肢に問題がないかチェック
    if (!setHasOverlap(q.choices)) continue;
    
    // 問題あり → 選択肢を再生成
    // 候補プールを作成（正解と重複しない単語のみ）
    const candidates = allWords.filter(w => {
      if (w.toLowerCase() === answer.toLowerCase()) return false;
      if (hasOverlap(w, answer)) return false;
      return true;
    });
    
    // 正解と似た長さの単語を優先的にソート
    const ansLen = answer.length;
    candidates.sort((a, b) => {
      const da = Math.abs(a.length - ansLen);
      const db = Math.abs(b.length - ansLen);
      return da - db;
    });
    
    // 3つのdistractorを選ぶ（互いに重複しないように）
    const distractors = [];
    const shuffledCandidates = shuffle(candidates.slice(0, Math.min(60, candidates.length)));
    
    for (const c of shuffledCandidates) {
      if (distractors.length >= 3) break;
      // 既に選んだdistractorとの重複をチェック
      let ok = true;
      for (const d of distractors) {
        if (hasOverlap(c, d)) { ok = false; break; }
      }
      if (ok) distractors.push(c);
    }
    
    // 十分な数が集まらなかった場合、全候補から再試行
    if (distractors.length < 3) {
      const allShuffled = shuffle(candidates);
      for (const c of allShuffled) {
        if (distractors.length >= 3) break;
        if (distractors.includes(c)) continue;
        let ok = true;
        for (const d of distractors) {
          if (hasOverlap(c, d)) { ok = false; break; }
        }
        if (ok) distractors.push(c);
      }
    }
    
    if (distractors.length >= 3) {
      q.choices = shuffle([answer, ...distractors]);
      fixedCount++;
    } else {
      console.log('  WARNING: Could not fix #' + q.rank + ' (' + answer + ') - only found ' + distractors.length + ' distractors');
    }
  }
  
  // 最終検証
  let remainingIssues = 0;
  for (const q of quiz) {
    if (setHasOverlap(q.choices)) remainingIssues++;
  }
  
  console.log(g.key + ': Fixed ' + fixedCount + ' questions, remaining issues: ' + remainingIssues);
  totalFixed += fixedCount;
  
  // 上書き保存
  fs.writeFileSync(g.quiz, JSON.stringify(quiz, null, 2), 'utf8');
}

console.log('\nTotal: Fixed ' + totalFixed + '/' + totalQuestions + ' questions');
