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
const timeText = document.getElementById('timeText');
const timeLabel = document.getElementById('timeLabel');
const statusText = document.getElementById('statusText');
const footnoteText = document.getElementById('footnoteText');
const metaStart = document.getElementById('metaStart');
const metaEnd = document.getElementById('metaEnd');

const startHourSelect = document.getElementById('startHourSelect');
const startMinuteSelect = document.getElementById('startMinuteSelect');
const workHourSelect = document.getElementById('workHourSelect');
const workMinuteSelect = document.getElementById('workMinuteSelect');
const includeLunchCheckbox = document.getElementById('includeLunchCheckbox');
const modeButtons = document.querySelectorAll('.mode-btn');
const workDurationError = document.getElementById('workDurationError');

const tabButtons = document.querySelectorAll('.tab-btn');
const dashboardPanel = document.getElementById('dashboardPanel');
const settingsPanel = document.getElementById('settingsPanel');

const radius = 118;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = `${circumference}`;
progressCircle.style.strokeDashoffset = `${circumference}`;

let settings = loadSettings();

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

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(safeSeconds % 60).padStart(2, '0');
  return `${hh}시간 ${mm}분 ${ss}초`;
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

function getSchedule(now) {
  const startDate = dateAtHM(now, Number(settings.startHour), Number(settings.startMinute));
  const configuredDuration = getEffectiveWorkMinutes();

  let workStart = new Date(startDate);
  let durationMinutes = configuredDuration;

  if (settings.mode === 'am') {
    durationMinutes = 240;
  }

  let workEnd = new Date(workStart.getTime() + durationMinutes * 60 * 1000);

  if (settings.mode === 'pm') {
    durationMinutes = 240;
    workEnd = new Date(workStart.getTime() + configuredDuration * 60 * 1000);
    workStart = new Date(workEnd.getTime() - durationMinutes * 60 * 1000);
  }

  return { workStart, workEnd, durationMinutes, configuredDuration };
}

function populateOptions() {
  for (let hh = 6; hh <= 12; hh += 1) {
    const option = document.createElement('option');
    option.value = String(hh);
    option.textContent = String(hh).padStart(2, '0');
    startHourSelect.appendChild(option);
  }

  for (let mm = 0; mm < 60; mm += 10) {
    const option = document.createElement('option');
    option.value = String(mm);
    option.textContent = String(mm).padStart(2, '0');
    startMinuteSelect.appendChild(option.cloneNode(true));
  }

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
}

function syncFormFromSettings() {
  startHourSelect.value = String(settings.startHour);
  startMinuteSelect.value = String(settings.startMinute);
  workHourSelect.value = String(settings.workHour);
  workMinuteSelect.value = String(settings.workMinute);
  includeLunchCheckbox.checked = Boolean(settings.includeLunch);

  modeButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === settings.mode);
  });

  workDurationError.classList.toggle('hidden', !hasDurationError());
}

function syncSettingsFromForm() {
  settings.startHour = Number(startHourSelect.value);
  settings.startMinute = Number(startMinuteSelect.value);
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
  const todayStart = dateAtHM(now, Number(settings.startHour), Number(settings.startMinute));
  if (now < todayStart) return todayStart;
  return addDays(todayStart, 1);
}

function updateCountdown() {
  const now = new Date();

  if (hasDurationError()) {
    workDurationError.classList.remove('hidden');
    percentText.textContent = '0%';
    timeLabel.textContent = '설정 확인 필요';
    timeText.textContent = '00시간 00분 00초';
    statusText.textContent = '근무 시간을 0시간 0분으로 설정할 수 없습니다.';
    footnoteText.textContent = '설정 탭에서 근무 시간을 다시 선택해주세요.';
    metaStart.textContent = formatHHMM(Number(settings.startHour), Number(settings.startMinute));
    metaEnd.textContent = '--:--';
    progressCircle.style.strokeDashoffset = `${circumference}`;
    document.body.classList.remove('working-time');
    return;
  }

  workDurationError.classList.add('hidden');

  const schedule = getSchedule(now);
  metaStart.textContent = formatHHMM(schedule.workStart.getHours(), schedule.workStart.getMinutes());
  metaEnd.textContent = formatHHMM(schedule.workEnd.getHours(), schedule.workEnd.getMinutes());

  const totalSeconds = schedule.durationMinutes * 60;
  let progress = 0;
  let remainingSeconds = 0;
  let status = '';
  let label = '퇴근까지 남은 시간';
  let isWorkingTime = false;

  if (settings.mode === 'annual') {
    const nextStart = addDays(dateAtHM(now, Number(settings.startHour), Number(settings.startMinute)), 1);
    remainingSeconds = (nextStart - now) / 1000;
    label = '익일 출근까지 남은 시간';
    status = `오늘은 연차입니다 🌴 내일 출근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '연차 설정: 익일 출근까지 남은 시간을 표시 중';
  } else if (now < schedule.workStart) {
    remainingSeconds = (schedule.workStart - now) / 1000;
    label = '출근까지 남은 시간';
    status = `아직 출근 전이에요. 업무 시작까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = `설정 근무시간: ${String(settings.workHour).padStart(2, '0')}시간 ${String(settings.workMinute).padStart(2, '0')}분${settings.includeLunch ? ' + 점심 1시간' : ''}`;
  } else if (now >= schedule.workEnd) {
    remainingSeconds = (getNextStartDate(now) - now) / 1000;
    progress = 100;
    label = '다음 출근까지 남은 시간';
    status = `퇴근 완료 🎉 다음 출근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '퇴근 이후: 다음 출근까지 남은 시간을 표시 중';
  } else {
    const workedSeconds = (now - schedule.workStart) / 1000;
    remainingSeconds = totalSeconds - workedSeconds;
    progress = (workedSeconds / totalSeconds) * 100;
    isWorkingTime = true;

    if (settings.mode === 'am') {
      status = '오전 반차 적용: 출근 후 4시간 근무합니다.';
      footnoteText.textContent = '오전 반차: 출근 후 4시간 근무';
    } else if (settings.mode === 'pm') {
      status = '오후 반차 적용: 퇴근 시각 기준 4시간 근무합니다.';
      footnoteText.textContent = '오후 반차: 퇴근 시각 기준 4시간 근무';
    } else {
      status = `업무 진행 중. 퇴근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
      footnoteText.textContent = `총 ${Math.floor(schedule.durationMinutes / 60)}시간 ${String(schedule.durationMinutes % 60).padStart(2, '0')}분 기준으로 계산`;
    }
  }

  const clamped = Math.min(Math.max(progress, 0), 100);
  const offset = circumference * (1 - clamped / 100);

  percentText.textContent = `${Math.floor(clamped)}%`;
  timeLabel.textContent = label;
  timeText.textContent = formatRemaining(remainingSeconds);
  statusText.textContent = status;
  progressCircle.style.strokeDashoffset = `${offset}`;
  document.body.classList.toggle('working-time', isWorkingTime);
}

populateOptions();
syncFormFromSettings();
updateCountdown();
setInterval(updateCountdown, 1000);

[startHourSelect, startMinuteSelect, workHourSelect, workMinuteSelect, includeLunchCheckbox].forEach((el) => {
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
