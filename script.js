// script.js - 테마 알람 앱 로직
// 모든 데이터는 localStorage에 저장됩니다.

// ---------- 초기 데이터 (기본 테마와 시간) ----------
const defaultThemes = {
    polarisA: {
        name: "Polaris A",
        enabled: true,
        times: [
            { time: "09:30", enabled: true },
            { time: "10:00", enabled: true },
            { time: "10:30", enabled: true },
            { time: "13:30", enabled: true },
            { time: "14:00", enabled: true },
            { time: "16:00", enabled: true },
            { time: "16:30", enabled: true },
            { time: "17:00", enabled: true }
        ]
    },
    polarisB: {
        name: "Polaris B",
        enabled: true,
        times: [
            { time: "11:00", enabled: true },
            { time: "11:30", enabled: true },
            { time: "12:00", enabled: true },
            { time: "14:30", enabled: true },
            { time: "15:00", enabled: true },
            { time: "15:30", enabled: true },
            { time: "17:00", enabled: true }
        ]
    },
    canopus: {
        name: "Canopus",
        enabled: true,
        times: [
            { time: "09:20", enabled: true },
            { time: "10:10", enabled: true },
            { time: "10:50", enabled: true },
            { time: "11:30", enabled: true },
            { time: "12:10", enabled: true },
            { time: "14:00", enabled: true },
            { time: "14:40", enabled: true },
            { time: "15:40", enabled: true },
            { time: "16:20", enabled: true },
            { time: "17:30", enabled: true }
        ]
    },
    timbo: {
        name: "팀보로봇",
        enabled: true,
        times: [
            { time: "10:20", enabled: true },
            { time: "11:10", enabled: true },
            { time: "13:00", enabled: true },
            { time: "13:50", enabled: true },
            { time: "14:40", enabled: true },
            { time: "15:30", enabled: true },
            { time: "16:20", enabled: true }
        ]
    },
    procion: {
        name: "프로시온",
        enabled: true,
        times: []
    },
    geforce: {
        name: "지포스",
        enabled: true,
        times: []
    },
    sandcraft: {
        name: "샌드크래프트",
        enabled: true,
        times: []
    }
};

// ---------- 로컬스토리지 처리 ----------
function loadThemes() {
    const stored = localStorage.getItem("alarmThemes");
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("localStorage 파싱 오류, 기본값 사용", e);
        }
    }
    // 최초 실행 또는 오류 시 기본값 반환
    return JSON.parse(JSON.stringify(defaultThemes));
}

function saveThemes(themes) {
    localStorage.setItem("alarmThemes", JSON.stringify(themes));
}

// ---------- 데이터 마이그레이션 (문자열 -> 객체) ----------
function migrateTimes(themes) {
    let modified = false;
    for (const key in themes) {
        const theme = themes[key];
        if (!theme.times || !Array.isArray(theme.times)) {
            theme.times = [];
            continue;
        }
        const newTimes = theme.times.map(t => {
            if (typeof t === 'string') {
                modified = true;
                return { time: t, enabled: true };
            }
            return t; // 이미 객체면 그대로
        });
        theme.times = newTimes;
    }
    return modified;
}

// ---------- 기본 테마 복구 (누락된 키 추가) ----------
function restoreDefaultThemes(themes) {
    let modified = false;
    for (const key in defaultThemes) {
        if (!themes[key]) {
            themes[key] = JSON.parse(JSON.stringify(defaultThemes[key])); // deep copy
            modified = true;
        }
    }
    return modified;
}

// 메인 초기화 로직
let themes = loadThemes();

// 마이그레이션 및 복구 실행
let needsSave = false;
if (themes.aries) { // Aries -> 팀보로봇
    themes.timbo = themes.aries;
    themes.timbo.name = "팀보로봇";
    delete themes.aries;
    needsSave = true;
}
if (migrateTimes(themes)) needsSave = true;
if (restoreDefaultThemes(themes)) needsSave = true;

if (needsSave) {
    saveThemes(themes);
}

let currentThemeKey = null;
let alertLeadTime = 6; // minutes before alarm
let alarmTimeouts = {};

// ---------- UI 요소 참조 ----------
const themeSelect = document.getElementById("themeSelect");
const themeToggle = document.getElementById("themeToggle");
const toggleLabel = document.getElementById("toggleLabel");
const themeTitle = document.getElementById("themeTitle");
const alarmList = document.getElementById("alarmTimes");
const addTimeBtn = document.getElementById("addTimeBtn");
const leadTimeSelect = document.getElementById("leadTimeSelect");
const addThemeBtn = document.getElementById("addThemeBtn");
const deleteThemeBtn = document.getElementById("deleteThemeBtn");
const alertModal = document.getElementById("alertModal");
const alertMessage = document.getElementById("alertMessage");
const snoozeBtn = document.getElementById("snoozeBtn");
const stopBtn = document.getElementById("stopBtn");

// ---------- UI 렌더링 함수 ----------

function populateThemeSelect() {
    themeSelect.innerHTML = "";
    // keys array 생성을 통해 순서를 보장하거나 정렬할 수 있음 (선택사항)
    for (const key in themes) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = themes[key].name;
        themeSelect.appendChild(opt);
    }


    // 현재 선택된 테마가 유효한지 확인
    if (!currentThemeKey || !themes[currentThemeKey]) {
        if (themeSelect.options.length > 0) {
            themeSelect.selectedIndex = 0;
            currentThemeKey = themeSelect.value;
        } else {
            currentThemeKey = null;
        }
    } else {
        themeSelect.value = currentThemeKey;
    }

    if (currentThemeKey) {
        onThemeChange();
    }
}



function onThemeChange() {
    currentThemeKey = themeSelect.value;
    const theme = themes[currentThemeKey];
    if (!theme) return;

    themeToggle.checked = theme.enabled;
    toggleLabel.textContent = theme.enabled ? "활성" : "비활성";
    renderAlarmList();
    scheduleAlarms();
}

function renderAlarmList() {
    if (!currentThemeKey || !themes[currentThemeKey]) return;
    const theme = themes[currentThemeKey];
    themeTitle.textContent = `${theme.name} 알람 리스트`;
    alarmList.innerHTML = "";

    theme.times.forEach((alarm, idx) => {
        const li = document.createElement("li");

        // 왼쪽 컨테이너 (체크박스 + 시간)
        const leftDiv = document.createElement("div");
        leftDiv.style.display = "flex";
        leftDiv.style.alignItems = "center";

        // 1. 활성/비활성 토글 (체크박스)
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = alarm.enabled;
        toggle.style.marginRight = "10px";
        toggle.onchange = () => {
            alarm.enabled = toggle.checked;
            saveThemes(themes);
            scheduleAlarms();
            updateStyle();
        };
        leftDiv.appendChild(toggle);

        // 2. 시간 표시
        const timeSpan = document.createElement("span");
        timeSpan.textContent = alarm.time;

        function updateStyle() {
            if (!alarm.enabled) {
                timeSpan.style.textDecoration = "line-through";
                timeSpan.style.color = "#aaa";
            } else {
                timeSpan.style.textDecoration = "none";
                timeSpan.style.color = "inherit";
            }
        }
        updateStyle(); // 초기 스타일 적용

        leftDiv.appendChild(timeSpan);
        li.appendChild(leftDiv);

        // 3. 삭제 버튼
        const delBtn = document.createElement("button");
        delBtn.textContent = "삭제";
        delBtn.className = "delete-btn"; // 스타일링 용이성을 위해 클래스 추가
        delBtn.onclick = () => {
            theme.times.splice(idx, 1);
            saveThemes(themes);
            renderAlarmList();
            scheduleAlarms();
        };
        li.appendChild(delBtn);
        alarmList.appendChild(li);
    });
}

function addTime() {
    if (!currentThemeKey) return;
    const input = prompt("새 알람 시간을 HH:MM 형식으로 입력하세요 (예: 08:45)");
    if (!input) return;
    if (!/^\d{2}:\d{2}$/.test(input)) {
        alert("시간 형식이 올바르지 않습니다.");
        return;
    }
    const theme = themes[currentThemeKey];
    // 중복 체크
    if (!theme.times.some(t => t.time === input)) {
        theme.times.push({ time: input, enabled: true });
        theme.times.sort((a, b) => a.time.localeCompare(b.time)); // 시간순 정렬
        saveThemes(themes);
        renderAlarmList();
        scheduleAlarms();
    } else {
        alert("이미 존재하는 시간입니다.");
    }
}

function deleteCurrentTheme() {
    const keys = Object.keys(themes);
    if (keys.length <= 1) {
        alert("최소 하나의 테마는 유지해야 합니다.");
        return;
    }
    if (!confirm(`'${themes[currentThemeKey].name}' 테마를 정말 삭제하시겠습니까?`)) return;

    delete themes[currentThemeKey];
    saveThemes(themes);
    populateThemeSelect(); // UI 갱신
}

// ---------- 이벤트 리스너 ----------
if (themeSelect) themeSelect.addEventListener("change", onThemeChange);

if (themeToggle) themeToggle.addEventListener("change", () => {
    if (!currentThemeKey) return;
    const theme = themes[currentThemeKey];
    theme.enabled = themeToggle.checked;
    toggleLabel.textContent = theme.enabled ? "활성" : "비활성";
    saveThemes(themes);
    scheduleAlarms();
});

if (addTimeBtn) addTimeBtn.addEventListener("click", addTime);

if (leadTimeSelect) leadTimeSelect.addEventListener("change", () => {
    const val = parseInt(leadTimeSelect.value, 10);
    if (!isNaN(val)) {
        alertLeadTime = val;
        scheduleAlarms();
    }
});

if (addThemeBtn) addThemeBtn.addEventListener("click", () => {
    const key = prompt("새 테마 키를 입력하세요 (영문 소문자, 공백 없이):");
    if (!key) return;
    if (themes[key]) {
        alert("이미 존재하는 키입니다.");
        return;
    }
    const name = prompt("새 테마 이름을 입력하세요:");
    if (!name) return;
    themes[key] = { name, enabled: true, times: [] };
    saveThemes(themes);
    populateThemeSelect();
    scheduleAlarms();
});

if (deleteThemeBtn) {
    deleteThemeBtn.addEventListener("click", deleteCurrentTheme);
}

// ---------- 알람 스케줄링 ----------
function clearAllTimeouts() {
    for (const id in alarmTimeouts) {
        clearTimeout(alarmTimeouts[id]);
    }
    alarmTimeouts = {};
}

function scheduleAlarms() {
    clearAllTimeouts();
    const now = new Date();
    for (const key in themes) {
        const theme = themes[key];
        if (!theme.enabled) continue;

        if (!theme.times) continue;

        theme.times.forEach(item => {
            if (!item.enabled) return; // 개별 알람 비활성화 체크
            const timeStr = item.time;
            const [h, m] = timeStr.split(":").map(Number);
            const alarmDate = new Date();
            alarmDate.setHours(h, m, 0, 0);

            // 과거 시간이면 다음 날로 이동
            if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1);

            // 6분 전 알림 시점 계산
            const alertTime = new Date(alarmDate.getTime() - alertLeadTime * 60 * 1000);
            const delay = alertTime - now;

            if (delay <= 0) return; // 이미 지나면 무시

            const timeoutId = setTimeout(() => {
                showAlert(timeStr, theme.name, key);
            }, delay);
            alarmTimeouts[`${key}-${timeStr}`] = timeoutId;
        });
    }
}

function showAlert(timeStr, themeName, themeKey) {
    alertMessage.textContent = `${themeName} 알람 (${timeStr})이 6분 전에 도착했습니다.`;
    alertModal.classList.remove("hidden");

    // 스누즈 핸들러 (5분 후 재알림)
    snoozeBtn.onclick = () => {
        alertModal.classList.add("hidden");
        const snoozeDelay = 5 * 60 * 1000; // 5분
        setTimeout(() => {
            showAlert(timeStr, themeName, themeKey);
        }, snoozeDelay);
    };

    // 끄기 핸들러 (알람 종료, 해당 시간은 삭제)
    stopBtn.onclick = () => {
        alertModal.classList.add("hidden");
        const theme = themes[themeKey];
        if (!theme) return;
        const idx = theme.times.findIndex(t => t.time === timeStr);
        if (idx !== -1) {
            theme.times.splice(idx, 1);
            saveThemes(themes);
            renderAlarmList();
            scheduleAlarms();
        }
    };
}

// 초기 실행
try {
    populateThemeSelect();
    window.addEventListener("beforeunload", clearAllTimeouts);
} catch (e) {
    console.error("Initialization failed:", e);
    alert("앱 초기화 중 오류가 발생했습니다. 로컬 데이터를 초기화하시겠습니까?");
    // 필요 시 localStorage.clear() 등의 복구 로직 추가 가능
}
