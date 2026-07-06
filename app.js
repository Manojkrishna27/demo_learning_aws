/**
 * CalcPro – Production-Ready Calculator Logic
 * Features: Standard + Scientific modes, History, Memory,
 *           Keyboard support, Accessibility, Error handling
 */

'use strict';

/* ============================================================
   State
   ============================================================ */
const state = {
  current:       '0',      // current number being entered
  previous:      '',       // previous number/result
  operator:      null,     // pending operator
  expression:    '',       // full expression string for display
  justEvaluated: false,    // was last action "="?
  newEntry:      false,    // should next digit replace current?
  memory:        0,        // memory register
  isScientific:  false,    // scientific mode toggle
  isRadians:     false,    // angle unit (false = degrees)
  history:       [],       // array of { expr, result }
  waitingForExp: false,    // after xʸ waiting for exponent
  pendingBase:   null,     // base for xʸ
};

/* ============================================================
   DOM References
   ============================================================ */
const $ = id => document.getElementById(id);

const DOM = {
  main:       $('mainDisplay'),
  expr:       $('expressionDisplay'),
  angleUnit:  $('angleUnit'),
  memInd:     $('memoryIndicator'),
  errInd:     $('errorIndicator'),
  histPanel:  $('historyPanel'),
  histList:   $('historyList'),
  histEmpty:  $('historyEmpty'),
  histBtn:    $('historyToggleBtn'),
  modeBtn:    $('modeToggleBtn'),
  sciPanel:   $('scientificPanel'),
  angleBtn:   $('btnAngle'),
  toast:      $('toast'),
};

/* ============================================================
   Utility Helpers
   ============================================================ */
const MAX_DIGITS = 15;
const LARGE_NUM  = 1e15;

function toNum(str) {
  return parseFloat(str.replace(/,/g, ''));
}

function formatDisplay(num) {
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  if (isNaN(num)) return 'Error';

  const abs = Math.abs(num);
  // Use scientific notation for very large/small numbers
  if (abs !== 0 && (abs >= LARGE_NUM || abs < 1e-9)) {
    return num.toExponential(6).replace(/\.?0+e/, 'e');
  }

  // Limit decimal places
  const str = String(parseFloat(num.toPrecision(12)));
  return str;
}

function showToast(msg, duration = 1800) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => DOM.toast.classList.remove('show'), duration);
}

function addRipple(btn, e) {
  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const x      = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
  const y      = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

/* ============================================================
   Display Rendering
   ============================================================ */
function renderDisplay() {
  // Main number
  DOM.main.textContent = state.current;
  DOM.main.classList.toggle('error-state', state.current === 'Error');

  // Expression
  DOM.expr.innerHTML = state.expression
    ? escapeHtml(state.expression)
    : '&nbsp;';

  // Memory indicator
  if (state.memory !== 0) {
    DOM.memInd.textContent = `M: ${formatDisplay(state.memory)}`;
    DOM.memInd.classList.add('visible');
  } else {
    DOM.memInd.textContent = '';
    DOM.memInd.classList.remove('visible');
  }

  // Angle unit badge
  if (state.isScientific) {
    DOM.angleUnit.textContent = state.isRadians ? 'RAD' : 'DEG';
    DOM.angleUnit.classList.add('visible');
  } else {
    DOM.angleUnit.classList.remove('visible');
  }

  // Active operator highlight
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
  if (state.operator && !state.justEvaluated) {
    const opMap = { '+': 'btnAdd', '-': 'btnSubtract', '×': 'btnMultiply', '÷': 'btnDivide' };
    const activeId = opMap[state.operator];
    if (activeId) $( activeId)?.classList.add('active-op');
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function animateResult() {
  DOM.main.classList.remove('animate-result');
  void DOM.main.offsetWidth; // reflow
  DOM.main.classList.add('animate-result');
}

/* ============================================================
   Core Calculation
   ============================================================ */
function calculate(a, operator, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    default:   return b;
  }
}

function evaluatePending() {
  if (!state.operator || state.previous === '') return;

  const a   = toNum(state.previous);
  const b   = toNum(state.current);
  let result;

  try {
    result = calculate(a, state.operator, b);
    if (!isFinite(result)) throw new Error('Result out of range');
  } catch (err) {
    setError(err.message);
    return;
  }

  const formatted = formatDisplay(result);
  const expr      = `${state.previous} ${state.operator} ${state.current} =`;

  addToHistory(expr, formatted);

  state.expression    = expr;
  state.previous      = '';
  state.operator      = null;
  state.current       = formatted;
  state.justEvaluated = true;
  state.newEntry      = false;

  animateResult();
  renderDisplay();
}

function setError(msg) {
  state.current    = 'Error';
  state.previous   = '';
  state.operator   = null;
  state.expression = '';
  state.newEntry   = true;

  DOM.errInd.textContent = msg;
  DOM.errInd.classList.add('visible');
  setTimeout(() => DOM.errInd.classList.remove('visible'), 3000);

  renderDisplay();
}

/* ============================================================
   Button Actions
   ============================================================ */
const actions = {

  /* — Digit —————————————————————————————————— */
  digit(val) {
    if (state.current === 'Error') {
      state.current = val;
      state.newEntry = false;
      return;
    }

    if (state.justEvaluated || state.newEntry) {
      state.current       = val === '.' ? '0.' : val;
      state.justEvaluated = false;
      state.newEntry      = false;
    } else {
      if (state.current.replace('-', '').replace('.', '').length >= MAX_DIGITS) return;

      if (val === '.' && state.current.includes('.')) return;

      state.current = state.current === '0' && val !== '.'
        ? val
        : state.current + val;
    }
    renderDisplay();
  },

  /* — Decimal ————————————————————————————————— */
  decimal() {
    this.digit('.');
  },

  /* — Clear ——————————————————————————————————— */
  clear() {
    state.current       = '0';
    state.previous      = '';
    state.operator      = null;
    state.expression    = '';
    state.justEvaluated = false;
    state.newEntry      = false;
    state.waitingForExp = false;
    state.pendingBase   = null;
    DOM.errInd.classList.remove('visible');
    renderDisplay();
  },

  /* — Backspace ——————————————————————————————— */
  backspace() {
    if (state.justEvaluated || state.current === 'Error') {
      this.clear();
      return;
    }
    if (state.current.length > 1) {
      state.current = state.current.slice(0, -1);
    } else {
      state.current = '0';
    }
    renderDisplay();
  },

  /* — Toggle sign ————————————————————————————— */
  toggleSign() {
    if (state.current === '0' || state.current === 'Error') return;
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
    renderDisplay();
  },

  /* — Percent ————————————————————————————————— */
  percent() {
    const n = toNum(state.current);
    if (isNaN(n)) return;
    if (state.operator && state.previous !== '') {
      // e.g. 100 + 10% → 100 + 10
      state.current = formatDisplay((toNum(state.previous) * n) / 100);
    } else {
      state.current = formatDisplay(n / 100);
    }
    renderDisplay();
  },

  /* — Operator ————————————————————————————————— */
  operator(op) {
    if (state.current === 'Error') return;

    if (state.operator && !state.newEntry && !state.justEvaluated) {
      evaluatePending();
      if (state.current === 'Error') return;
    }

    state.expression    = `${state.current} ${op}`;
    state.previous      = state.current;
    state.operator      = op;
    state.justEvaluated = false;
    state.newEntry      = true;
    renderDisplay();
  },

  /* — Equals ——————————————————————————————————— */
  equals() {
    if (state.current === 'Error') { this.clear(); return; }
    if (state.waitingForExp) {
      this.applyPow();
      return;
    }
    evaluatePending();
  },

  /* — Divide / multiply / add / subtract wrappers — */
  divide()   { this.operator('÷'); },
  multiply() { this.operator('×'); },
  add()      { this.operator('+'); },
  subtract() { this.operator('-'); },

  /* ===================== SCIENTIFIC ===================== */

  toggleAngle() {
    state.isRadians = !state.isRadians;
    DOM.angleBtn.textContent = state.isRadians ? 'RAD' : 'DEG';
    showToast(state.isRadians ? 'Radians mode' : 'Degrees mode');
    renderDisplay();
  },

  toRadians(val) {
    return state.isRadians ? val : val * (Math.PI / 180);
  },

  applyUnary(fn, label) {
    if (state.current === 'Error') return;
    const n = toNum(state.current);
    let result;
    try {
      result = fn(n);
      if (!isFinite(result) || isNaN(result)) throw new Error('Math error');
    } catch (err) {
      setError(err.message);
      return;
    }
    const expr = `${label}(${state.current})`;
    state.expression    = `${expr} =`;
    const formatted     = formatDisplay(result);
    addToHistory(`${expr}`, formatted);
    state.current       = formatted;
    state.justEvaluated = true;
    state.newEntry      = false;
    animateResult();
    renderDisplay();
  },

  sin()   { this.applyUnary(n => Math.sin(this.toRadians(n)),  'sin'); },
  cos()   { this.applyUnary(n => Math.cos(this.toRadians(n)),  'cos'); },
  tan()   { this.applyUnary(n => Math.tan(this.toRadians(n)),  'tan'); },
  log()   { this.applyUnary(n => { if (n <= 0) throw new Error('Domain error'); return Math.log10(n); }, 'log'); },
  ln()    { this.applyUnary(n => { if (n <= 0) throw new Error('Domain error'); return Math.log(n);   }, 'ln');  },
  sqrt()  { this.applyUnary(n => { if (n < 0)  throw new Error('Domain error'); return Math.sqrt(n);  }, '√');   },
  pow2()  { this.applyUnary(n => n ** 2, 'sq');    },
  pow3()  { this.applyUnary(n => n ** 3, 'cube');  },
  inv()   { this.applyUnary(n => { if (n === 0) throw new Error('Division by zero'); return 1 / n; }, '1/'); },
  abs()   { this.applyUnary(n => Math.abs(n), '|'); },

  fact() {
    this.applyUnary(n => {
      if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('Domain error');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }, 'n!');
  },

  pi() {
    state.current       = formatDisplay(Math.PI);
    state.justEvaluated = false;
    state.newEntry      = false;
    renderDisplay();
  },

  e() {
    state.current       = formatDisplay(Math.E);
    state.justEvaluated = false;
    state.newEntry      = false;
    renderDisplay();
  },

  exp() {
    // Append ×10^ entry flow
    if (!state.current.includes('e') && !state.current.includes('E')) {
      state.pendingBase   = state.current;
      state.expression    = `${state.current} × 10^`;
      state.current       = '0';
      state.newEntry      = false;
      state.waitingForExp = true;
      renderDisplay();
    }
  },

  powN() {
    if (state.current === 'Error') return;
    state.pendingBase   = state.current;
    state.expression    = `${state.current} ^`;
    state.waitingForExp = true;
    state.newEntry      = true;
    renderDisplay();
  },

  applyPow() {
    if (state.pendingBase === null) return;
    const base = toNum(state.pendingBase);
    const exp  = toNum(state.current);
    this.applyUnary(() => base ** exp, `${state.pendingBase}^`);
    state.waitingForExp = false;
    state.pendingBase   = null;
  },

  /* ===================== MEMORY ===================== */
  memStore()  {
    state.memory = toNum(state.current);
    renderDisplay();
    showToast('Value stored in memory');
  },
  memRecall() {
    if (state.memory !== 0) {
      state.current  = formatDisplay(state.memory);
      state.newEntry = false;
      renderDisplay();
    }
  },
  memAdd()    {
    state.memory += toNum(state.current);
    renderDisplay();
    showToast(`M: ${formatDisplay(state.memory)}`);
  },
  memClear()  {
    state.memory = 0;
    renderDisplay();
    showToast('Memory cleared');
  },
};

/* ============================================================
   History
   ============================================================ */
function addToHistory(expr, result) {
  state.history.unshift({ expr, result });
  if (state.history.length > 50) state.history.pop();
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    DOM.histEmpty.style.display = '';
    return;
  }
  DOM.histEmpty.style.display = 'none';

  // Remove all except empty placeholder
  [...DOM.histList.children].forEach(c => {
    if (c !== DOM.histEmpty) c.remove();
  });

  state.history.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.setAttribute('role', 'listitem');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `${item.expr} equals ${item.result}. Click to reuse.`);
    li.innerHTML = `
      <span class="history-expr">${escapeHtml(item.expr)}</span>
      <span class="history-result">${escapeHtml(item.result)}</span>
    `;
    li.addEventListener('click', () => {
      state.current       = item.result;
      state.justEvaluated = true;
      state.newEntry      = false;
      renderDisplay();
      showToast('Value loaded');
    });
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') li.click();
    });
    DOM.histList.appendChild(li);
  });
}

/* ============================================================
   Mode Toggles
   ============================================================ */
function toggleScientific() {
  state.isScientific = !state.isScientific;
  DOM.sciPanel.classList.toggle('open', state.isScientific);
  DOM.sciPanel.setAttribute('aria-hidden', String(!state.isScientific));
  DOM.modeBtn.classList.toggle('active', state.isScientific);
  DOM.modeBtn.setAttribute('aria-label',
    state.isScientific ? 'Switch to standard mode' : 'Switch to scientific mode'
  );
  DOM.angleUnit.classList.toggle('visible', state.isScientific);
  showToast(state.isScientific ? 'Scientific mode on' : 'Standard mode');
  renderDisplay();
}

function toggleHistory() {
  const open = DOM.histPanel.classList.toggle('open');
  DOM.histPanel.setAttribute('aria-hidden', String(!open));
  DOM.histBtn.classList.toggle('active', open);
  DOM.histBtn.setAttribute('aria-label', open ? 'Close history panel' : 'Toggle history panel');
}

/* ============================================================
   Event Wiring
   ============================================================ */
function handleButtonClick(e) {
  const btn = e.target.closest('.btn, .icon-btn, .clear-history-btn');
  if (!btn) return;

  addRipple(btn, e);

  // Header / panel actions
  if (btn === DOM.histBtn)   { toggleHistory(); return; }
  if (btn === DOM.modeBtn)   { toggleScientific(); return; }
  if (btn.id === 'clearHistoryBtn') {
    state.history = [];
    DOM.histEmpty.style.display = '';
    [...DOM.histList.children].forEach(c => { if (c !== DOM.histEmpty) c.remove(); });
    showToast('History cleared');
    return;
  }

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  if (value !== undefined) {
    actions.digit(value);
  } else if (action && actions[action]) {
    actions[action].call(actions);
  }
}

document.getElementById('calculator').addEventListener('click', handleButtonClick);

/* ============================================================
   Keyboard Support
   ============================================================ */
const KEY_MAP = {
  '0': () => actions.digit('0'),
  '1': () => actions.digit('1'),
  '2': () => actions.digit('2'),
  '3': () => actions.digit('3'),
  '4': () => actions.digit('4'),
  '5': () => actions.digit('5'),
  '6': () => actions.digit('6'),
  '7': () => actions.digit('7'),
  '8': () => actions.digit('8'),
  '9': () => actions.digit('9'),
  '.': () => actions.decimal(),
  ',': () => actions.decimal(),
  '+': () => actions.add(),
  '-': () => actions.subtract(),
  '*': () => actions.multiply(),
  '/': () => actions.divide(),
  'Enter':     () => actions.equals(),
  '=':         () => actions.equals(),
  'Backspace': () => actions.backspace(),
  'Delete':    () => actions.clear(),
  'Escape':    () => actions.clear(),
  '%':         () => actions.percent(),
  's':         () => { if (state.isScientific) actions.sin.call(actions); },
  'c':         () => { if (state.isScientific) actions.cos.call(actions); },
  'l':         () => { if (state.isScientific) actions.log.call(actions); },
  'r':         () => { if (state.isScientific) actions.sqrt.call(actions); },
  'h':         () => toggleHistory(),
  'S':         () => toggleScientific(),
};

document.addEventListener('keydown', e => {
  // Don't intercept if user is focused on a non-calculator input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const handler = KEY_MAP[e.key];
  if (handler) {
    e.preventDefault();
    handler();

    // Visual feedback on matching button
    const btnSel = e.key === 'Enter' || e.key === '='    ? '#btnEquals'
                 : e.key === 'Backspace'                  ? '#btnBack'
                 : e.key === 'Escape' || e.key === 'Delete' ? '#btnClear'
                 : null;
    if (btnSel) {
      const el = document.querySelector(btnSel);
      if (el) {
        el.classList.add('btn-key-active');
        setTimeout(() => el.classList.remove('btn-key-active'), 120);
      }
    }
  }
});

// Add active style for keyboard key press
const style = document.createElement('style');
style.textContent = '.btn-key-active { transform: scale(0.94) !important; filter: brightness(1.3); }';
document.head.appendChild(style);

/* ============================================================
   Init
   ============================================================ */
(function init() {
  renderDisplay();
  renderHistory();
  console.info('CalcPro initialised ✓');
})();
