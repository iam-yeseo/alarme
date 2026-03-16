const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const TOTAL_WORK_SECONDS = 9 * 60 * 60;

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
  const workEnd = getTodayTime(WORK_END_HOUR);

  if (now < workStart) return 0;
  if (now >= workEnd) return TOTAL_WORK_SECONDS;

  return Math.min((now - workStart) / 1000, TOTAL_WORK_SECONDS);
}

function getStatusMessage(now, progress, remainingSeconds) {
  const workStart = getTodayTime(WORK_START_HOUR);
  const workEnd = getTodayTime(WORK_END_HOUR);

  if (now < workStart) {
    const untilStart = Math.floor((workStart - now) / 1000);
    return `아직 출근 전이에요. 업무 시작까지 ${formatRemaining(untilStart)} 남았어요.`;
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
