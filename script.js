const STORAGE_KEY = 'alarmeSettings';

const DEFAULT_SETTINGS = {
  startMinutes: 9 * 60,
  workDurationMinutes: 9 * 60,
  halfDay: 'none',
  leaveType: 'none',
};

const progressCircle = document.getElementById('progressCircle');
const percentText = document.getElementById('percentText');
const timeText = document.getElementById('timeText');
const timeLabel = document.getElementById('timeLabel');
const statusText = document.getElementById('statusText');
const footnoteText = document.getElementById('footnoteText');
const metaStart = document.getElementById('metaStart');
const metaEnd = document.getElementById('metaEnd');

const startTimeSelect = document.getElementById('startTimeSelect');
const workHourSelect = document.getElementById('workHourSelect');
const workMinuteSelect = document.getElementById('workMinuteSelect');
const halfDaySelect = document.getElementById('halfDaySelect');
const leaveTypeSelect = document.getElementById('leaveTypeSelect');

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
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function minutesToHHMM(totalMinutes) {
  const safe = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = String(Math.floor(safe / 60)).padStart(2, '0');
  const mm = String(safe % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(safeSeconds % 60).padStart(2, '0');
  return `${hh}시간 ${mm}분 ${ss}초`;
}

function dateAtMinutes(baseDate, minutes) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function addDays(d, days) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getSchedule(now) {
  const startMinutes = Number(settings.startMinutes);
  const configuredDuration = Math.max(10, Number(settings.workDurationMinutes));

  let startDate = dateAtMinutes(now, startMinutes);
  let durationMinutes = configuredDuration;

  if (settings.halfDay === 'am') {
    durationMinutes = 4 * 60;
  }

  let endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  if (settings.halfDay === 'pm') {
    durationMinutes = 4 * 60;
    endDate = new Date(startDate.getTime() + configuredDuration * 60 * 1000);
    startDate = new Date(endDate.getTime() - durationMinutes * 60 * 1000);
  }

  return {
    startDate,
    endDate,
    durationMinutes,
    configuredDuration,
  };
}

function populateOptions() {
  for (let m = 360; m <= 780; m += 10) {
    const option = document.createElement('option');
    option.value = String(m);
    option.textContent = minutesToHHMM(m);
    startTimeSelect.appendChild(option);
  }

  for (let h = 1; h <= 12; h += 1) {
    const option = document.createElement('option');
    option.value = String(h);
    option.textContent = `${h}시간`;
    workHourSelect.appendChild(option);
  }

  for (let mm = 0; mm < 60; mm += 10) {
    const option = document.createElement('option');
    option.value = String(mm);
    option.textContent = `${String(mm).padStart(2, '0')}분`;
    workMinuteSelect.appendChild(option);
  }
}

function syncFormFromSettings() {
  startTimeSelect.value = String(settings.startMinutes);
  const hours = Math.floor(settings.workDurationMinutes / 60);
  const mins = settings.workDurationMinutes % 60;
  workHourSelect.value = String(hours);
  workMinuteSelect.value = String(mins);
  halfDaySelect.value = settings.halfDay;
  leaveTypeSelect.value = settings.leaveType;
}

function syncSettingsFromForm() {
  settings.startMinutes = Number(startTimeSelect.value);
  const h = Number(workHourSelect.value);
  const m = Number(workMinuteSelect.value);
  settings.workDurationMinutes = Math.max(10, h * 60 + m);
  settings.halfDay = halfDaySelect.value;
  settings.leaveType = leaveTypeSelect.value;
  saveSettings();
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

function getNextStartDate(now, baseStartMinutes) {
  const todayStart = dateAtMinutes(now, baseStartMinutes);
  if (now < todayStart) return todayStart;
  return addDays(todayStart, 1);
}

function updateCountdown() {
  const now = new Date();
  const schedule = getSchedule(now);

  metaStart.textContent = `${minutesToHHMM(schedule.startDate.getHours() * 60 + schedule.startDate.getMinutes())}`;
  metaEnd.textContent = `${minutesToHHMM(schedule.endDate.getHours() * 60 + schedule.endDate.getMinutes())}`;

  const workTotalSeconds = schedule.durationMinutes * 60;
  let progress = 0;
  let remainingSeconds = 0;
  let status = '';
  let label = '퇴근까지 남은 시간';
  let isWorkingTime = false;

  if (settings.leaveType === 'annual') {
    const nextStart = addDays(dateAtMinutes(now, Number(settings.startMinutes)), 1);
    remainingSeconds = (nextStart - now) / 1000;
    progress = 0;
    label = '익일 출근까지 남은 시간';
    status = `오늘은 연차입니다 🌴 내일 출근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '연차 설정: 익일 출근까지 남은 시간을 표시 중';
  } else if (now < schedule.startDate) {
    remainingSeconds = (schedule.startDate - now) / 1000;
    progress = 0;
    label = '출근까지 남은 시간';
    status = `아직 출근 전이에요. 업무 시작까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = `설정 근무시간: ${Math.floor(settings.workDurationMinutes / 60)}시간 ${(settings.workDurationMinutes % 60).toString().padStart(2, '0')}분`;
  } else if (now >= schedule.endDate) {
    const nextStart = getNextStartDate(now, Number(settings.startMinutes));
    remainingSeconds = (nextStart - now) / 1000;
    progress = 100;
    label = '다음 출근까지 남은 시간';
    status = `퇴근 완료 🎉 다음 출근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
    footnoteText.textContent = '퇴근 이후: 다음 출근까지 남은 시간을 표시 중';
  } else {
    const workedSeconds = (now - schedule.startDate) / 1000;
    remainingSeconds = workTotalSeconds - workedSeconds;
    progress = (workedSeconds / workTotalSeconds) * 100;
    isWorkingTime = true;

    if (settings.halfDay === 'am') {
      status = `오전 반차 적용 중: ${minutesToHHMM(Number(settings.startMinutes))} 출근 후 4시간 근무합니다.`;
      footnoteText.textContent = '오전 반차: 출근 후 4시간 근무';
    } else if (settings.halfDay === 'pm') {
      status = '오후 반차 적용 중: 퇴근 시각 기준 4시간 근무합니다.';
      footnoteText.textContent = '오후 반차: 퇴근 시각 기준 4시간 근무';
    } else {
      status = `업무 진행 중. 퇴근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
      footnoteText.textContent = `총 ${Math.floor(schedule.durationMinutes / 60)}시간 ${(schedule.durationMinutes % 60).toString().padStart(2, '0')}분 기준으로 계산`;
    }
  }

  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 100) / 100);

  percentText.textContent = `${Math.floor(Math.min(Math.max(progress, 0), 100))}%`;
  timeText.textContent = formatRemaining(remainingSeconds);
  timeLabel.textContent = label;
  progressCircle.style.strokeDashoffset = `${offset}`;
  statusText.textContent = status;

  document.body.classList.toggle('working-time', isWorkingTime);
}

populateOptions();
syncFormFromSettings();
updateCountdown();
setInterval(updateCountdown, 1000);

[startTimeSelect, workHourSelect, workMinuteSelect, halfDaySelect, leaveTypeSelect].forEach((el) => {
  el.addEventListener('change', () => {
    syncSettingsFromForm();
    updateCountdown();
  });
});

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});
