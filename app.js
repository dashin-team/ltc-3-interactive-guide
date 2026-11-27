(function () {
  "use strict";

  const CARE = {
    family: { monthly: 0, label: "家人照顧", range: "帳面人力費 0 元，但有隱形薪資損失" },
    foreign: { monthly: 29000, label: "外籍看護", range: "約 26,000–32,000 元／月（含膳宿）" },
    domestic: { monthly: 67500, label: "本國看護", range: "約 45,000–90,000 元／月" },
    inst_double: { monthly: 52500, label: "機構雙人房", range: "約 45,000–60,000 元／月" },
    inst_single: { monthly: 70000, label: "機構單人房", range: "約 70,000 元以上／月" }
  };
  const CMS_CARE = { 2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180 };
  const COPAY = { general: 0.16, mid: 0.05, low: 0 };
  const DEVICE_COPAY = { general: 0.3, mid: 0.1, low: 0 };
  const TRANSPORT_COPAY = { general: 0.25, mid: 0.08, low: 0 };
  const SALARY = 44300;
  const CONSUMABLE_BASIC = 8000;
  const CONSUMABLE_TUBE = 14600;
  const ASSISTIVE = 80000;
  const TRANSPORT_MID = 1840;

  const state = {
    mode: "foreign",
    years: 10,
    cms: 5,
    household: "general",
    consumables: true,
    nutrition: false,
    assistive: true,
    salaryLoss: false,
    q1: null,
    q2: null,
    q3: null
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function ntd(n) {
    const v = Math.round(n);
    return "NT$ " + v.toLocaleString("zh-TW");
  }
  function wan(n) {
    if (n < 10000) return ntd(n);
    const w = n / 10000;
    const txt = w >= 100 ? w.toFixed(0) : (w >= 10 ? w.toFixed(1) : w.toFixed(1));
    return Math.round(w * 10) / 10 + " 萬元";
  }

  function calc(s) {
    const years = Number(s.years);
    const months = years * 12;
    const mode = CARE[s.mode];
    const careCost = mode.monthly * months;
    const consMonth = s.consumables ? (s.nutrition ? CONSUMABLE_TUBE : CONSUMABLE_BASIC) : 0;
    const consCost = consMonth * months;
    const assist = s.assistive ? ASSISTIVE : 0;
    const includeSalary = s.mode === "family" ? true : s.salaryLoss;
    const salary = includeSalary ? SALARY * months : 0;
    const cash = careCost + consCost + assist;
    const total = cash + salary;

    const copay = COPAY[s.household];
    const isInst = s.mode.indexOf("inst_") === 0;
    const isForeign = s.mode === "foreign";

    let govCare = 0, govRespite = 0, govTransport = 0, govDevice = 0, govInst = 0;
    if (isInst) {
      if (Number(s.cms) >= 4) govInst = 15000 * months;
    } else {
      const share = isForeign ? 0.3 : 1;
      govCare = CMS_CARE[s.cms] * share * (1 - copay) * months;
      const respiteYear = Number(s.cms) >= 7 ? 48510 : 32340;
      govRespite = respiteYear * (1 - copay) * years;
      govTransport = TRANSPORT_MID * (1 - TRANSPORT_COPAY[s.household]) * months;
      if (s.assistive) {
        const quota = 40000;
        govDevice = Math.min(assist, quota) * (1 - DEVICE_COPAY[s.household]);
      }
    }
    const govTotal = govCare + govRespite + govTransport + govDevice + govInst;
    const gap = Math.max(0, total - govTotal);
    const cover = total > 0 ? govTotal / total : 0;
    return {
      careCost, consCost, assist, salary, cash, total, govTotal, gap, cover,
      govCare, govRespite, govTransport, govDevice, govInst, consMonth, years, months, includeSalary
    };
  }

  /* Header nav */
  const nav = $("#site-nav");
  const toggle = $("#nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("#site-nav a").forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  /* Quiz */
  const quizFeedback = {
    q1: {
      family: "家人照顧是目前最普遍的選擇（約 63%）。看起來好像最省錢，但平均每天要投入 13 小時以上、長達 8–9 年。若主要照顧者因此離開職場，以主計處平均月薪 44,300 元估算，10 年機會成本就超過 530 萬元。",
      foreign: "外籍看護每月約 2.6–3.2 萬元，10 年照顧人力費加上日常耗材，常常超過 430 萬元。政府長照 3.0 不會支付看護薪水；聘僱家庭最多只能使用照顧及專業服務額度的 30%（且不能用居家服務），並可在看護休假時申請喘息。",
      domestic: "本國看護每月約 4.5–9 萬元，是最接近一對一專業照顧、但也最昂貴的居家方案之一。10 年下來，光人力費就可能達到 540–1,080 萬元。",
      inst_double: "機構雙人房每月約 4.5–6 萬元。即使符合長照 3.0 住宿式補助（中重度失能者每月最高 1.5 萬、全年最高 18 萬），家庭每個月仍可能要自付 3–4.5 萬元以上；10 年總支出常見超過 680 萬元。",
      inst_single: "機構單人房每月可能達 7 萬元以上。長照 3.0 住宿式補助即使加碼到每月最高 1.5 萬元，對單人房來說仍只占一小部分，10 年自付壓力會明顯高於雙人房。"
    },
    q2: {
      almost: "很多家庭會以為「有長照 3.0 就差不多夠了」。其實一般戶使用居家服務仍要自負 16%，而且補助有額度上限，也不包含 24 小時照顧、看護薪資、多數機構住宿費、紙尿布與營養品，以及家人離職的薪資損失。實際能幫上的，往往只有總花費的一小部分。",
      half: "一半是合理的期待，但實際比例通常更低。以常見的外籍看護或機構雙人房為例，政府補助多半只能覆蓋約兩到三成，甚至更少。關鍵在「補助有上限，花費卻是全天候、長達 8–10 年」。",
      third: "你的直覺很接近現實。長照 3.0 是很好的底層支持，但家庭仍需自籌大部分費用。這正是「用長照 3.0 支撐生活，用商業保險維繫尊嚴」雙軌規劃存在的原因。",
      unsure: "沒關係，這正是接下來要一起算清楚的事。我們會用官方額度與真實行情，幫你看出政府最多能補多少、家裡還要準備多少。"
    },
    q3: {
      deposit: "如果要用存款支應 8–10 年、可能數百萬的照顧費，家庭的退休金、子女教育與緊急預備金都可能被先用掉。愈早把「確定的現金流」準備好，愈能守住這些積蓄。",
      children: "子女分擔在文化上很常見，但也可能讓下一代同時面對房貸、育兒與職涯中斷。規劃的意義，是把「不得不犧牲誰」變成「家裡有選擇權」。",
      gov: "長照 3.0 能減輕部分負擔，但從官方額度來看，它比較像「支撐基本生活與喘息」，而不是把 10 年全天照顧費都付清。試算結果會直接告訴你還差多少。",
      insurance: "這是很多家庭選擇的補位方式：用長照 3.0 申請得到的服務打底，再用保險提供可運用的現金，去補看護費、機構差額或耗材。實際商品與理賠，仍要以保單條款為準。",
      later: "大多數家庭都是事到臨頭才開始想這筆錢從哪裡來。現在先看一遍真實費用與缺口，就是在幫未來的自己爭取選擇權。"
    }
  };

  function showStep(n) {
    $$(".quiz-step").forEach((el) => {
      el.hidden = Number(el.dataset.step) !== n;
    });
    $$(".quiz-dot").forEach((d, i) => {
      d.classList.toggle("on", i + 1 === n);
      d.classList.toggle("done", i + 1 < n);
    });
  }

  function renderQFeedback(step) {
    const box = $("#quiz-feedback-" + step);
    if (!box) return;
    const key = state["q" + step];
    const map = quizFeedback["q" + step];
    if (!key || !map[key]) { box.classList.remove("show"); return; }
    let extra = "";
    if (step === 1 || step === 2) {
      const preview = calc({
        mode: state.mode,
        years: 10,
        cms: 5,
        household: "general",
        consumables: true,
        nutrition: false,
        assistive: true,
        salaryLoss: state.mode === "family"
      });
      extra = `<span class="gap-num">${wan(preview.gap)}</span>
        <span>以一般戶、長照第 5 級、照顧 10 年估算，家庭仍可能要自籌約此金額（含${state.mode === "family" ? "隱形薪資損失與耗材輔具" : "照顧人力、日常耗材與輔具"}）。政府最多約補 ${wan(preview.govTotal)}，約佔總花費 ${Math.round(preview.cover * 100)}%。</span>`;
    }
    box.innerHTML = `<p>${map[key]}</p>${extra}`;
    box.classList.add("show");
  }

  $$(".choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.q;
      const val = btn.dataset.val;
      $$(`.choice[data-q="${q}"]`).forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state["q" + q] = val;
      if (q === "1") {
        state.mode = val;
        setModePills();
        if (val === "family") {
          state.salaryLoss = true;
          const t = $("#toggle-salary");
          if (t) t.checked = true;
        }
      }
      renderQFeedback(Number(q));
      persist();
      updateCalc();
    });
  });

  $$("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = Number(btn.dataset.next);
      const cur = n - 1;
      if (!state["q" + cur]) {
        const box = $("#quiz-feedback-" + cur);
        box.innerHTML = "<p>請先點選一個最接近你想法的答案，我們會立刻用數據回饋給你。</p>";
        box.classList.add("show");
        return;
      }
      showStep(n);
    });
  });
  $$("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showStep(Number(btn.dataset.back)));
  });
  showStep(1);

  /* Tabs */
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const group = tab.dataset.group;
      $$(`.tab[data-group="${group}"]`).forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      $$(`.panel[data-group="${group}"]`).forEach((p) => {
        p.classList.toggle("active", p.id === tab.dataset.target);
      });
    });
  });

  /* Government eligibility */
  function updateElig() {
    const ident = $$(".elig-id:checked").length > 0;
    const duration = $("#elig-duration") && $("#elig-duration").checked;
    const cms = $("#elig-cms") && $("#elig-cms").checked;
    const box = $("#elig-result");
    if (!box) return;
    if (ident && duration && cms) {
      box.className = "adl-result pass";
      box.innerHTML = "<strong>初步看起來，可能符合申請長照 3.0 評估與給付的方向。</strong><p>請撥打 1966 或洽當地長期照顧管理中心，由照管專員到府評估後，才會核定長照需要等級（第 2–8 級）與給付額度。本檢核僅供教育參考，不能取代正式評估。</p>";
    } else {
      const miss = [];
      if (!ident) miss.push("身分資格（65 歲以上、55 歲以上原住民、身障證明、全年齡失智，或 PAC 收案之一）");
      if (!duration) miss.push("預期或已達 6 個月以上生活無法自理");
      if (!cms) miss.push("經評估達長照需要等級第 2 級以上（第 1 級不給付）");
      box.className = "adl-result warn";
      box.innerHTML = "<strong>目前還缺少部分條件：</strong><p>" + miss.join("、") + "。</p><p>若尚未失能，仍可先認識社區據點與預防延緩失能服務；真正有需求時再撥 1966。</p>";
    }
  }
  $$(".elig-id, #elig-duration, #elig-cms").forEach((el) => el && el.addEventListener("change", updateElig));
  updateElig();

  /* ADL checker */
  const ADL_ITEMS = [
    ["eat", "進食障礙", "須別人協助才能取用食物或穿脫進食輔具。"],
    ["transfer", "移位障礙", "須別人協助才能由床移位至椅子或輪椅。"],
    ["toilet", "如廁障礙", "如廁過程中須別人協助才能保持平衡、整理衣物或使用衛生紙。"],
    ["bath", "沐浴障礙", "須別人協助才能完成盆浴或淋浴。"],
    ["walk", "平地行動障礙", "雖經別人扶持或使用輔具亦無法行動，且須別人協助才能操作輪椅或電動輪椅。"],
    ["dress", "更衣障礙", "須別人完全協助才能完成穿脫衣褲鞋襪（含義肢、支架）。"]
  ];
  const adlBox = $("#adl-list");
  if (adlBox) {
    adlBox.innerHTML = ADL_ITEMS.map(([id, title, desc]) => `
      <label class="adl" id="adl-${id}">
        <input type="checkbox" data-adl="${id}">
        <div><b>${title}</b><span>${desc}</span></div>
      </label>`).join("");
    adlBox.addEventListener("change", updateAdl);
  }
  function updateAdl() {
    const boxes = $$("[data-adl]");
    const n = boxes.filter((b) => b.checked).length;
    boxes.forEach((b) => b.closest(".adl").classList.toggle("on", b.checked));
    const r = $("#adl-result");
    if (!r) return;
    if (n >= 3) {
      r.className = "adl-result pass";
      r.innerHTML = `<strong>目前勾選 ${n} 項，已達「六取三」的生理功能障礙門檻。</strong>
        <p>依金管會《長期照顧保險單示範條款》，經專科醫師診斷判定，六項日常生活自理能力持續存有三項（含）以上障礙，即可能符合「長期照顧狀態」的生理路徑。實際理賠仍須符合該保單的等待期或免責期（常見約 90 日），並以保單條款與專科醫師證明為準。</p>`;
    } else {
      r.className = "adl-result warn";
      r.innerHTML = `<strong>目前勾選 ${n} 項，尚未達到生理功能障礙的「六取三」門檻。</strong>
        <p>請注意：條款裡的「障礙」不是「做起來吃力」，而是「須別人協助／完全協助」。例如可扶著輔具行走，通常還不算平地行動障礙。若是失智，還有另一條路：整體臨床失智量表（CDR）達中度（≧ 2 分）也可能符合認知功能障礙。</p>`;
    }
  }
  updateAdl();

  /* Calculator UI */
  function setModePills() {
    $$("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    const hint = $("#mode-hint");
    if (hint && CARE[state.mode]) hint.textContent = CARE[state.mode].range;
    const salWrap = $("#salary-wrap");
    if (salWrap) {
      salWrap.style.opacity = state.mode === "family" ? "1" : "";
      const lab = $("#salary-label");
      if (lab) lab.textContent = state.mode === "family"
        ? "計入主要照顧者離職的薪資損失（家人照顧建議開啟）"
        : "計入家人因照顧而請假／離職的薪資損失";
    }
  }
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    if (state.mode === "family") {
      state.salaryLoss = true;
      const t = $("#toggle-salary");
      if (t) t.checked = true;
    }
    setModePills();
    persist();
    updateCalc();
  }));

  const yearSlider = $("#years");
  const yearLabel = $("#years-val");
  if (yearSlider) {
    yearSlider.addEventListener("input", () => {
      state.years = Number(yearSlider.value);
      if (yearLabel) yearLabel.textContent = state.years + " 年";
      persist();
      updateCalc();
    });
  }
  const cmsSel = $("#cms");
  if (cmsSel) cmsSel.addEventListener("change", () => {
    state.cms = Number(cmsSel.value);
    persist();
    updateCalc();
  });
  const hhSel = $("#household");
  if (hhSel) hhSel.addEventListener("change", () => {
    state.household = hhSel.value;
    persist();
    updateCalc();
  });
  function bindToggle(id, key) {
    const el = $(id);
    if (!el) return;
    el.checked = !!state[key];
    el.addEventListener("change", () => {
      state[key] = el.checked;
      persist();
      updateCalc();
    });
  }
  bindToggle("#toggle-cons", "consumables");
  bindToggle("#toggle-nutrition", "nutrition");
  bindToggle("#toggle-assist", "assistive");
  bindToggle("#toggle-salary", "salaryLoss");

  function updateCalc() {
    const r = calc(state);
    const setTxt = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    setTxt("#res-total", wan(r.total));
    setTxt("#res-total-sub", ntd(r.total));
    setTxt("#res-gov", wan(r.govTotal));
    setTxt("#res-gov-sub", ntd(r.govTotal));
    setTxt("#res-gap", wan(r.gap));
    setTxt("#res-gap-sub", ntd(r.gap));
    setTxt("#res-cover", Math.round(r.cover * 100) + "%");

    const max = Math.max(r.total, r.govTotal, 1);
    const setW = (id, val) => { const el = $(id); if (el) el.style.width = Math.min(100, (val / max) * 100) + "%"; };
    setW("#bar-total", r.total);
    setW("#bar-gov", r.govTotal);
    setW("#bar-gap", r.gap);
    setTxt("#bar-total-n", wan(r.total));
    setTxt("#bar-gov-n", wan(r.govTotal));
    setTxt("#bar-gap-n", wan(r.gap));

    const parts = [];
    parts.push(`照顧人力／機構費用 ${wan(r.careCost)}`);
    if (r.consCost) parts.push(`日常耗材${state.nutrition ? "（含管灌／特殊營養）" : ""} ${wan(r.consCost)}`);
    if (r.assist) parts.push(`輔具與環境改善（一次估算） ${wan(r.assist)}`);
    if (r.salary) parts.push(`家人隱形薪資損失 ${wan(r.salary)}`);
    const govParts = [];
    if (r.govInst) govParts.push(`住宿式機構補助 ${wan(r.govInst)}`);
    if (r.govCare) govParts.push(`照顧及專業服務 ${wan(r.govCare)}`);
    if (r.govRespite) govParts.push(`喘息服務 ${wan(r.govRespite)}`);
    if (r.govTransport) govParts.push(`交通接送 ${wan(r.govTransport)}`);
    if (r.govDevice) govParts.push(`輔具額度 ${wan(r.govDevice)}`);

    const insight = $("#calc-insight");
    if (insight) {
      let msg = `以「${CARE[state.mode].label}」、長照第 ${state.cms} 級、${hhLabel(state.household)}、照顧 ${state.years} 年估算：總花費約 ${wan(r.total)}，政府最多約補 ${wan(r.govTotal)}（約 ${Math.round(r.cover * 100)}%），家庭仍需自籌約 ${wan(r.gap)}。`;
      if (state.mode === "family") {
        msg += "家人照顧的帳面支出較低，但居家服務無法取代全天照顧，時間與職涯中斷往往才是最大成本。";
      } else if (state.mode.indexOf("inst_") === 0) {
        if (state.cms < 4) msg += "目前設定尚未達第 4 級，住宿式補助通常無法申請（需中重度失能或符合其他資格），缺口會更大。";
        else msg += "入住機構當月通常不能同時使用長照「四包錢」，補助以住宿式方案為主，且當月入住須達日曆天數一半以上。";
      } else if (state.mode === "foreign") {
        msg += "外籍看護薪水不在長照給付範圍內，這也是缺口常常落在七成左右的原因。";
      }
      msg += `<br><span class="note">花費組成：${parts.join("、")}。政府補助組成（用滿額度時）：${govParts.join("、") || "0"}。數字為教育試算，實際以主管機關核定與機構／看護報價為準。</span>`;
      insight.innerHTML = msg;
    }
  }
  function hhLabel(h) {
    return { general: "一般戶（自負 16%）", mid: "中低收入戶（自負 5%）", low: "低收入戶（自負 0%）" }[h] || "";
  }

  function persist() {
    try { localStorage.setItem("ltc3-guide", JSON.stringify({
      mode: state.mode, years: state.years, cms: state.cms, household: state.household,
      consumables: state.consumables, nutrition: state.nutrition, assistive: state.assistive,
      salaryLoss: state.salaryLoss, q1: state.q1, q2: state.q2, q3: state.q3
    })); } catch (e) {}
  }
  function restore() {
    try {
      const raw = localStorage.getItem("ltc3-guide");
      if (!raw) return;
      const d = JSON.parse(raw);
      Object.assign(state, d);
    } catch (e) {}
    if (yearSlider) { yearSlider.value = state.years; if (yearLabel) yearLabel.textContent = state.years + " 年"; }
    if (cmsSel) cmsSel.value = String(state.cms);
    if (hhSel) hhSel.value = state.household;
    const mapT = { "#toggle-cons": "consumables", "#toggle-nutrition": "nutrition", "#toggle-assist": "assistive", "#toggle-salary": "salaryLoss" };
    Object.keys(mapT).forEach((id) => { const el = $(id); if (el) el.checked = !!state[mapT[id]]; });
    if (state.q1) {
      const b = $(`.choice[data-q="1"][data-val="${state.q1}"]`);
      if (b) b.classList.add("selected");
      renderQFeedback(1);
    }
    if (state.q2) {
      const b = $(`.choice[data-q="2"][data-val="${state.q2}"]`);
      if (b) b.classList.add("selected");
    }
    if (state.q3) {
      const b = $(`.choice[data-q="3"][data-val="${state.q3}"]`);
      if (b) b.classList.add("selected");
    }
    setModePills();
  }
  restore();
  updateCalc();

  /* Gap cards */
  $$(".gap-card .opener").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".gap-card");
      const open = !card.classList.contains("open");
      $$(".gap-card").forEach((c) => c.classList.remove("open"));
      if (open) card.classList.add("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* Contrast toggle */
  $$("[data-face]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("[data-face]").forEach((b) => b.classList.toggle("on", b === btn));
      const which = btn.dataset.face;
      $$(".face").forEach((f) => { f.hidden = f.dataset.face !== which; });
    });
  });

  /* Count-up when visible */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const target = el.getAttribute("data-count");
      if (!target || el.dataset.done) return;
      el.dataset.done = "1";
      el.textContent = target;
    });
  }, { threshold: 0.4 }) : null;
  if (io) $$("[data-count]").forEach((el) => io.observe(el));
})();
