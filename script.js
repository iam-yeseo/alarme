const WORK_START_HOUR = 9;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;
const WORK_END_HOUR = 18;
const TOTAL_WORK_SECONDS = 8 * 60 * 60; // 9시간 중 점심 1시간 제외 = 8시간

const progressCircle = document.getElementById('progressCircle');
const percentText = document.getElementById('percentText');
const timeText = document.getElementById('timeText');
const statusText = document.getElementById('statusText');

const radius = 118;
const circumference = 2 * Math.PI * radius;

progressCircle.style.strokeDasharray = `${circumference}`;
progressCircle.style.strokeDashoffset = `${circumference}`;

function getTodayTime(hour, minute = 0, second = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second);
}

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(safeSeconds % 60).padStart(2, '0');
  return `${hh}시간 ${mm}분 ${ss}초`;
}

function getWorkedSeconds(now) {
  const workStart = getTodayTime(WORK_START_HOUR);
  const lunchStart = getTodayTime(LUNCH_START_HOUR);
  const lunchEnd = getTodayTime(LUNCH_END_HOUR);
  const workEnd = getTodayTime(WORK_END_HOUR);

  if (now < workStart) return 0;
  if (now >= workEnd) return TOTAL_WORK_SECONDS;

  let worked = 0;

  // 오전 근무: 09:00 ~ 12:00
  const morningEnd = lunchStart;
  if (now > workStart) {
    worked += Math.max(0, Math.min(now, morningEnd) - workStart) / 1000;
  }

  // 오후 근무: 13:00 ~ 18:00
  if (now > lunchEnd) {
    worked += Math.max(0, Math.min(now, workEnd) - lunchEnd) / 1000;
  }

  return Math.min(worked, TOTAL_WORK_SECONDS);
}

function getStatusMessage(now, progress, remainingSeconds) {
  const workStart = getTodayTime(WORK_START_HOUR);
  const lunchStart = getTodayTime(LUNCH_START_HOUR);
  const lunchEnd = getTodayTime(LUNCH_END_HOUR);
  const workEnd = getTodayTime(WORK_END_HOUR);

  if (now < workStart) {
    const untilStart = Math.floor((workStart - now) / 1000);
    return `아직 출근 전이에요. 업무 시작까지 ${formatRemaining(untilStart)} 남았어요.`;
  }

  if (now >= lunchStart && now < lunchEnd) {
    const untilLunchEnd = Math.floor((lunchEnd - now) / 1000);
    return `지금은 점심시간 🍱 ${formatRemaining(untilLunchEnd)} 뒤에 다시 업무가 시작돼요.`;
  }

  if (now >= workEnd) {
    return '퇴근 완료 🎉 오늘도 고생했어요. 이제 도망... 아니, 퇴장하세요.';
  }

  if (progress >= 75) {
    return `거의 다 왔어요. 퇴근까지 ${formatRemaining(remainingSeconds)} 남음.`;
  }

  if (progress >= 50) {
    return `후반전 진입! 퇴근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
  }

  return `업무 진행 중. 퇴근까지 ${formatRemaining(remainingSeconds)} 남았어요.`;
}

function updateCountdown() {
  const now = new Date();
  const workedSeconds = getWorkedSeconds(now);
  const remainingSeconds = TOTAL_WORK_SECONDS - workedSeconds;
  const progress = (workedSeconds / TOTAL_WORK_SECONDS) * 100;
  const offset = circumference * (1 - progress / 100);

  percentText.textContent = `${Math.floor(progress)}%`;
  timeText.textContent = formatRemaining(remainingSeconds);
  progressCircle.style.strokeDashoffset = `${offset}`;
  statusText.textContent = getStatusMessage(now, progress, remainingSeconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);
