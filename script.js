const STORAGE_KEY = 'alarmeSettings';

const DEFAULT_SETTINGS = {
  startHour: 9,
  startMinute: 0,
  workHour: 9,
  workMinute: 0,
  includeLunch: false,
  mode: 'none', // none | am | pm | annual
};

const progressCircle = document.getElementById('progressCircle');
const percentText = document.getElementById('percentText');
const progressCaption = document.getElementById('progressCaption');
const timeText = document.getElementById('timeText');
const timeLabel = document.getElementById('timeLabel');
const statusText = document.getElementById('statusText');
const footnoteText = document.getElementById('footnoteText');
const appTitle = document.getElementById('appTitle');
const metaStart = document.getElementById('metaStart');
const metaEnd = document.getElementById('metaEnd');

const workHourSelect = document.getElementById('workHourSelect');
const workMinuteSelect = document.getElementById('workMinuteSelect');
const includeLunchCheckbox = document.getElementById('includeLunchCheckbox');
const modeButtons = document.querySelectorAll('.mode-btn');
const workDurationError = document.getElementById('workDurationError');

const metaStartBtn = document.getElementById('metaStartBtn');
const metaEndBtn = document.getElementById('metaEndBtn');
const timeEditor = document.getElementById('timeEditor');
const timeEditorTitle = document.getElementById('timeEditorTitle');
const editorHourSelect = document.getElementById('editorHourSelect');
const editorMinuteSelect = document.getElementById('editorMinuteSelect');
const timeEditorApplyBtn = document.getElementById('timeEditorApplyBtn');
const timeEditorCancelBtn = document.getElementById('timeEditorCancelBtn');

const tabButtons = document.querySelectorAll('.tab-btn');
const dashboardPanel = document.getElementById('dashboardPanel');
const settingsPanel = document.getElementById('settingsPanel');

const radius = 118;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = `${circumference}`;
progressCircle.style.strokeDashoffset = `${circumference}`;

let settings = loadSettings();
let editingTarget = null; // 'start' | 'end'

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function formatHHMM(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatRemainingCompact(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safeSeconds / 3600);
  const mm = Math.floor((safeSeconds % 3600) / 60);
  const ss = safeSeconds % 60;

  if (hh > 0) return `${hh}시간 ${mm}분 ${ss}초`;
  if (mm > 0) return `${mm}분 ${ss}초`;
  return `${ss}초`;
}

function dateAtHM(baseDate, hour, minute) {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(d, days) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getBaseWorkMinutes() {
  return Number(settings.workHour) * 60 + Number(settings.workMinute);
}

function getEffectiveWorkMinutes() {
  const base = getBaseWorkMinutes();
  return base + (settings.includeLunch ? 60 : 0);
}

function hasDurationError() {
  return getBaseWorkMinutes() === 0;
}

function getConfiguredStart(now) {
  return dateAtHM(now, Number(settings.startHour), Number(settings.startMinute));
}

function getConfiguredEnd(now) {
  return new Date(getConfiguredStart(now).getTime() + getEffectiveWorkMinutes() * 60 * 1000);
}

function getSchedule(now) {
  const configuredStart = getConfiguredStart(now);
  const configuredEnd = getConfiguredEnd(now);

  let workStart = new Date(configuredStart);
  let durationMinutes = getEffectiveWorkMinutes();

  if (settings.mode === 'am') {
    durationMinutes = 240;
  }

  let workEnd = new Date(workStart.getTime() + durationMinutes * 60 * 1000);

  if (settings.mode === 'pm') {
    durationMinutes = 240;
    workEnd = new Date(configuredEnd);
    workStart = new Date(workEnd.getTime() - durationMinutes * 60 * 1000);
  }

  return { workStart, workEnd, durationMinutes, configuredStart, configuredEnd };
}

function populateOptions() {
  for (let hh = 0; hh <= 12; hh += 1) {
    const option = document.createElement('option');
    option.value = String(hh);
    option.textContent = String(hh);
    workHourSelect.appendChild(option);
  }

  for (let mm = 0; mm < 60; mm += 10) {
    const option = document.createElement('option');
    option.value = String(mm);
    option.textContent = String(mm).padStart(2, '0');
    workMinuteSelect.appendChild(option);
  }

  for (let hh = 0; hh < 24; hh += 1) {
    const option = document.createElement('option');
    option.value = String(hh);
    option.textContent = String(hh).padStart(2, '0');
    editorHourSelect.appendChild(option);
  }

  for (let mm = 0; mm < 60; mm += 10) {
    const option = document.createElement('option');
    option.value = String(mm);
    option.textContent = String(mm).padStart(2, '0');
    editorMinuteSelect.appendChild(option);
  }
}

function syncFormFromSettings() {
  workHourSelect.value = String(settings.workHour);
  workMinuteSelect.value = String(settings.workMinute);
  includeLunchCheckbox.checked = Boolean(settings.includeLunch);

  modeButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === settings.mode);
  });

  workDurationError.classList.toggle('hidden', !hasDurationError());
}

function syncSettingsFromForm() {
  settings.workHour = Number(workHourSelect.value);
  settings.workMinute = Number(workMinuteSelect.value);
  settings.includeLunch = includeLunchCheckbox.checked;
  saveSettings();
}

function setMode(mode) {
  settings.mode = mode;
  saveSettings();

  modeButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function setTab(tabName) {
  const dashboardActive = tabName === 'dashboard';
  dashboardPanel.classList.toggle('hidden', !dashboardActive);
  settingsPanel.classList.toggle('hidden', dashboardActive);

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function getNextStartDate(now) {
  const todayStart = getConfiguredStart(now);
  if (now < todayStart) return todayStart;
  return addDays(todayStart, 1);
}

function showTimeEditor(target, now) {
  editingTarget = target;
  const schedule = getSchedule(now);
  const base = target === 'start' ? schedule.configuredStart : schedule.configuredEnd;

  editorHourSelect.value = String(base.getHours());
  editorMinuteSelect.value = String(base.getMinutes());
  timeEditorTitle.textContent = target === 'start' ? '출근 시간 변경' : '퇴근 시간 변경';
  timeEditor.classList.remove('hidden');
}

function hideTimeEditor() {
  editingTarget = null;
  timeEditor.classList.add('hidden');
}

function applyTimeEditor() {
  if (!editingTarget) return;

  const selectedHour = Number(editorHourSelect.value);
  const selectedMinute = Number(editorMinuteSelect.value);

  if (editingTarget === 'start') {
    settings.startHour = selectedHour;
    settings.startMinute = selectedMinute;
  } else {
    const now = new Date();
    const start = getConfiguredStart(now);
    const selectedEnd = dateAtHM(now, selectedHour, selectedMinute);
    const endCandidate = selectedEnd > start ? selectedEnd : addDays(selectedEnd, 1);
    const diffMinutes = Math.round((endCandidate - start) / (60 * 1000));
    const baseMinutes = diffMinutes - (settings.includeLunch ? 60 : 0);

    if (baseMinutes <= 0) {
      workDurationError.textContent = '퇴근 시간 설정이 출근 시간보다 이르거나 근무 시간이 0 이하입니다.';
      workDurationError.classList.remove('hidden');
      return;
    }

    settings.workHour = Math.floor(baseMinutes / 60);
    settings.workMinute = baseMinutes % 60;

    if (settings.workHour > 12 || settings.workMinute % 10 !== 0) {
      workDurationError.textContent = '퇴근 시간은 10분 단위이며 최대 12시간 50분 범위 내에서 설정해주세요.';
      workDurationError.classList.remove('hidden');
      return;
    }

    workDurationError.textContent = '근무 시간은 0시간 0분으로 설정할 수 없습니다.';
  }

  saveSettings();
  syncFormFromSettings();
  hideTimeEditor();
  updateCountdown();
}

function updateCountdown() {
  const now = new Date();

  if (hasDurationError()) {
    workDurationError.classList.remove('hidden');
    percentText.textContent = '0%';
    progressCaption.textContent = '출근 준비율';
    appTitle.textContent = '출근 알리미';
    timeLabel.textContent = '설정 확인 필요';
    timeText.textContent = '0초';
    statusText.textContent = '근무 시간을 0시간 0분으로 설정할 수 없습니다.';
    footnoteText.textContent = '설정 탭에서 근무 시간을 다시 선택해주세요.';
    metaStart.textContent = formatHHMM(Number(settings.startHour), Number(settings.startMinute));
    metaEnd.textContent = '--:--';
    progressCircle.style.strokeDashoffset = `${circumference}`;
    document.body.classList.remove('working-time');
    return;
  }

  workDurationError.classList.add('hidden');
  workDurationError.textContent = '근무 시간은 0시간 0분으로 설정할 수 없습니다.';

  const schedule = getSchedule(now);
  metaStart.textContent = formatHHMM(schedule.configuredStart.getHours(), schedule.configuredStart.getMinutes());
  metaEnd.textContent = formatHHMM(schedule.configuredEnd.getHours(), schedule.configuredEnd.getMinutes());

  const totalWorkSeconds = schedule.durationMinutes * 60;
  let progress = 0;
  let remainingSeconds = 0;
  let status = '';
  let label = '퇴근까지 남은 시간';
  let isWorkingTime = false;
  let title = '퇴근 알리미';
  let caption = '오늘 업무 진행률';

  if (settings.mode === 'annual') {
    const nextStart = getNextStartDate(now);
    const dayStart = addDays(nextStart, -1);
    remainingSeconds = (nextStart - now) / 1000;
    progress = ((now - dayStart) / (nextStart - dayStart)) * 100;
    label = '익일 출근까지 남은 시간';
    title = '출근 알리미';
    caption = '출근 준비율';
    status = `오늘은 연차입니다 🌴 내일 출근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '연차 설정: 익일 출근까지 남은 시간을 표시 중';
  } else if (now < schedule.workStart) {
    const prevEnd = addDays(schedule.workEnd, -1);
    remainingSeconds = (schedule.workStart - now) / 1000;
    progress = ((now - prevEnd) / (schedule.workStart - prevEnd)) * 100;
    label = '출근까지 남은 시간';
    title = '출근 알리미';
    caption = '출근 준비율';
    status = `아직 출근 전이에요. 출근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = `설정 근무시간: ${String(settings.workHour).padStart(2, '0')}시간 ${String(settings.workMinute).padStart(2, '0')}분${settings.includeLunch ? ' + 점심 1시간' : ''}`;
  } else if (now >= schedule.workEnd) {
    const nextStart = getNextStartDate(now);
    remainingSeconds = (nextStart - now) / 1000;
    progress = ((now - schedule.workEnd) / (nextStart - schedule.workEnd)) * 100;
    label = '출근까지 남은 시간';
    title = '출근 알리미';
    caption = '출근 준비율';
    status = `퇴근 완료 🎉 출근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '퇴근 이후: 출근 준비율을 표시 중';
  } else {
    const workedSeconds = (now - schedule.workStart) / 1000;
    remainingSeconds = totalWorkSeconds - workedSeconds;
    progress = (workedSeconds / totalWorkSeconds) * 100;
    isWorkingTime = true;

    if (settings.mode === 'am') {
      status = `오전 반차 적용: 퇴근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
      footnoteText.textContent = '오전 반차: 출근 후 4시간 근무';
    } else if (settings.mode === 'pm') {
      status = `오후 반차 적용: 퇴근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
      footnoteText.textContent = '오후 반차: 퇴근 시각 기준 4시간 근무';
    } else {
      status = `업무 진행 중. 퇴근까지 ${formatRemainingCompact(remainingSeconds)} 남았어요.`;
      footnoteText.textContent = `총 ${Math.floor(schedule.durationMinutes / 60)}시간 ${String(schedule.durationMinutes % 60).padStart(2, '0')}분 기준으로 계산`;
    }
  }

  const clamped = Math.min(Math.max(progress, 0), 100);
  const offset = circumference * (1 - clamped / 100);

  appTitle.textContent = title;
  progressCaption.textContent = caption;
  percentText.textContent = `${Math.floor(clamped)}%`;
  timeLabel.textContent = label;
  timeText.textContent = formatRemainingCompact(remainingSeconds);
  statusText.textContent = status;
  progressCircle.style.strokeDashoffset = `${offset}`;
  document.body.classList.toggle('working-time', isWorkingTime);
}

populateOptions();
syncFormFromSettings();
updateCountdown();
setInterval(updateCountdown, 1000);

[workHourSelect, workMinuteSelect, includeLunchCheckbox].forEach((el) => {
  el.addEventListener('change', () => {
    syncSettingsFromForm();
    updateCountdown();
  });
});

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setMode(btn.dataset.mode);
    updateCountdown();
  });
});

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

metaStartBtn.addEventListener('click', () => showTimeEditor('start', new Date()));
metaEndBtn.addEventListener('click', () => showTimeEditor('end', new Date()));
timeEditorApplyBtn.addEventListener('click', applyTimeEditor);
timeEditorCancelBtn.addEventListener('click', hideTimeEditor);
