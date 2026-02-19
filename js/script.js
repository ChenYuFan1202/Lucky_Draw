/**
 * 2026 ISS 春酒 Spring Feast - 抽獎系統
 * 
 * 功能：
 * - 權重抽樣（票數越多，中獎機率越高）
 * - 轉盤動畫
 * - localStorage 狀態保存
 * - 多輪獎項支援
 * - 可調整抽獎券數量
 */

// ========================================
// 全域狀態
// ========================================

const STORAGE_KEY = 'iss_spring_feast_2026';

// 獎項中英對照表
const PRIZE_TRANSLATIONS = {
    '首獎': 'First Prize',
    '大獎': 'Grand Prize',
    '二獎': 'Second Prize',
    '三獎': 'Third Prize',
    '四獎': 'Fourth Prize',
    '五獎': 'Fifth Prize',
    '特獎（一）': 'Special Prize (1)',
    '特獎（二）': 'Special Prize (2)',
    '特獎（三）': 'Special Prize (3)',
    '特獎（四）': 'Special Prize (4)'
};

/**
 * 取得帶英文的獎項名稱
 */
function getPrizeWithEnglish(prize) {
    const english = PRIZE_TRANSLATIONS[prize];
    return english ? `${prize} ${english}` : prize;
}

// 參與者資料
async function loadCSV() {
    try {
        const response = await fetch('data/name.csv');
        const text = await response.text();
        parseCSV(text);
    } catch (error) {
        console.error('CSV 載入失敗:', error);
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const participants = [];

    // 從第 1 行開始（跳過 header）
    for (let i = 1; i < lines.length; i++) {
        const name = lines[i].trim();

        if (name) {
            participants.push({
                id: i,
                name: name,
                tickets: 1  // 預設每人 1 張
            });
        }
    }

    state.participants = participants;
    state.winners = [];
    state.currentPrize = '特獎（四）';

    saveState();
    renderAll();
}

// 應用程式狀態
let state = {
    participants: [],
    winners: [],
    currentPrize: '特獎（四）'
};

// 轉盤狀態
let isSpinning = false;
let currentRotation = 0;
let pendingWinner = null;

// Canvas 相關
let canvas, ctx;

// 音效相關
let audioContext = null;

// ========================================
// 音效系統
// ========================================

/**
 * 初始化音效系統
 */
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 恢復被暫停的 context
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

/**
 * 播放轉盤旋轉音效（柔和的轉盤聲）
 */
function playSpinSound() {
    initAudio();
    
    // 只播放咖嗒聲效果，移除刺耳的方波
    playTickSound(4);
}

/**
 * 播放咖崠咖崠聲（模擬指針劃過扇形）
 */
function playTickSound(totalDuration) {
    let tickCount = 0;
    const maxTicks = 60;
    
    function tick() {
        if (tickCount >= maxTicks) return;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        // 使用三角波，更柔和
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 200, audioContext.currentTime);
        
        // 降低音量
        gain.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.04);
        
        tickCount++;
        
        // 間隔漸漸變長（減速效果）
        const progress = tickCount / maxTicks;
        const interval = 30 + progress * 180; // 30ms 到 210ms
        
        if (tickCount < maxTicks) {
            setTimeout(tick, interval);
        }
    }
    
    tick();
}

/**
 * 播放中獎音效（慶祝的旋律）
 */
function playWinSound() {
    initAudio();
    
    // 播放一段歡快的旋律
    const notes = [523, 659, 784, 1047, 784, 1047]; // C5, E5, G5, C6, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.4];
    
    let time = audioContext.currentTime;
    
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
        
        osc.start(time);
        osc.stop(time + durations[i]);
        
        time += durations[i];
    });
    
    // 加入開彩響聲效果
    setTimeout(() => playFanfareSound(), 200);
}

/**
 * 播放開彩響聲效果
 */
function playFanfareSound() {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);
    
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    
    // 和弦效果
    osc1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
    osc2.frequency.setValueAtTime(659, audioContext.currentTime); // E5
    
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.8);
    osc2.stop(audioContext.currentTime + 0.8);
}

// ========================================
// 初始化
// ========================================

/**
 * 頁面載入時初始化
 */
document.addEventListener('DOMContentLoaded', async function() {
    initCanvas();
    
    // 先載入 localStorage 資料
    const hasLocalData = loadState();

    if (!hasLocalData) {
        await loadCSV();
    }
    
    // 載入資料後再設置事件監聽器（這樣 dropdown 才能同步正確的獎項）
    setupEventListeners();

    renderAll();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    canvas = document.getElementById('wheelCanvas');
    ctx = canvas.getContext('2d');
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    // 獎項下拉選單變更事件
    const prizeSelect = document.getElementById('currentPrize');
    prizeSelect.value = state.currentPrize;
    prizeSelect.addEventListener('change', function(e) {
        state.currentPrize = e.target.value;
        saveState();
    });
}   

// ========================================
// 資料存取 (localStorage)
// ========================================

/**
 * 從 localStorage 載入狀態
 */
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);
            state.participants = parsed.participants || [];
            state.winners = parsed.winners || [];
            state.currentPrize = parsed.currentPrize || '特獎（四）';
            return true;
        }

        return false;

    } catch (error) {
        console.error('載入狀態錯誤:', error);
        return false;
    }
}

/**
 * 儲存狀態到 localStorage
 */
function saveState() {
    try {
        const data = {
            participants: state.participants,
            winners: state.winners,
            currentPrize: state.currentPrize
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('狀態已儲存');
    } catch (error) {
        console.error('儲存狀態時發生錯誤:', error);
        showToast('儲存資料時發生錯誤 Save error', 'error');
    }
}

// ========================================
// 渲染功能
// ========================================

/**
 * 渲染所有 UI 元件
 */
function renderAll() {
    renderParticipants();
    renderWinners();
    drawWheel();
}

/**
 * 渲染參與者列表
 */
function renderParticipants(searchTerm = '') {
    const container = document.getElementById('participantsList');
    
    if (state.participants.length === 0) {
        container.innerHTML = '<div class="no-winners">目前沒有參與者<br>No participants</div>';
        return;
    }

    // 過濾參與者
    const searchLower = searchTerm.toLowerCase().trim();
    const filteredParticipants = searchLower 
        ? state.participants.filter(p => p.name.toLowerCase().includes(searchLower))
        : state.participants;

    if (filteredParticipants.length === 0) {
        container.innerHTML = '<div class="no-winners">找不到符合的參與者<br>No match found</div>';
        return;
    }

    let html = '';
    filteredParticipants.forEach(p => {
        const noTickets = p.tickets === 0 ? 'no-tickets' : '';
        html += `
            <div class="participant-item ${noTickets}" data-id="${p.id}">
                <span class="participant-name">${escapeHtml(p.name)}</span>
                <div class="participant-tickets">
                    <button class="ticket-btn remove" onclick="adjustTickets(${p.id}, -1)" ${p.tickets === 0 ? 'disabled' : ''}>−</button>
                    <span class="ticket-count">${p.tickets}</span>
                    <button class="ticket-btn add" onclick="adjustTickets(${p.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 渲染中獎紀錄
 */
function renderWinners() {
    const container = document.getElementById('winnersList');
    
    if (state.winners.length === 0) {
        container.innerHTML = '<div class="no-winners">尚無中獎紀錄<br>No winners yet</div>';
        return;
    }

    let html = '';
    // 反向顯示，最新的在上面
    const reversedWinners = [...state.winners].reverse();
    reversedWinners.forEach((w, index) => {
        // 計算原始陣列中的索引
        const originalIndex = state.winners.length - 1 - index;
        // title="刪除此紀錄"
        html += `
            <div class="winner-item">
                <button class="winner-delete-btn" onclick="removeWinner(${originalIndex})">🗑️</button>
                <span class="winner-prize">${escapeHtml(getPrizeWithEnglish(w.prize))}</span>
                <span class="winner-name">${escapeHtml(w.name)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========================================
// 轉盤繪製
// ========================================

/**
 * 繪製轉盤
 */
function drawWheel() {
    const pool = buildWeightedPool();
    
    if (pool.length === 0) {
        drawEmptyWheel();
        return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 計算每個扇形的角度
    const sliceAngle = (2 * Math.PI) / pool.length;
    
    // 顏色陣列（春節風格）
    const colors = [
        '#E53935', '#FF7043', '#FFB300', '#FDD835',
        '#C62828', '#EF5350', '#FFCA28', '#FFE082',
        '#D32F2F', '#FF8A65', '#FFD54F', '#FFF176'
    ];
    
    // 繪製每個扇形
    pool.forEach((name, index) => {
        const startAngle = index * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        
        // 繪製扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // 繪製邊框
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 繪製文字
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 14px Microsoft JhengHei, sans-serif';
        
        // 根據扇形數量調整文字位置
        const textRadius = radius * 0.75;
        ctx.fillText(truncateName(name, 6), textRadius, 5);
        ctx.restore();
    });
    
    // 中央按鈕會蓋在 canvas 上，不需要繪製中心圓
}

/**
 * 繪製空轉盤（無參與者時）
 */
function drawEmptyWheel() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f5f5f5';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#999';
    ctx.font = 'bold 16px Microsoft JhengHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('無可抽獎人員', centerX, centerY - 12);
    ctx.fillText('No participants', centerX, centerY + 12);
}

// ========================================
// 抽獎邏輯
// ========================================

/**
 * 建立權重池
 * 每個人依照 tickets 數量在池中出現相應次數
 */
function buildWeightedPool() {
    const pool = [];
    state.participants.forEach(p => {
        for (let i = 0; i < p.tickets; i++) {
            pool.push(p.name);
        }
    });
    return pool;
}

/**
 * 取得總票數
 */
function getTotalTickets() {
    return state.participants.reduce((sum, p) => sum + p.tickets, 0);
}

/**
 * 開始抽獎
 */
function startSpin() {
    // 檢查是否正在抽獎
    if (isSpinning) {
        showToast('抽獎進行中 Drawing in progress...', 'error');
        return;
    }
    
    // 檢查是否有可抽獎的人
    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
        showToast('所有參與者的抽獎券都已用完！All tickets used!', 'error');
        return;
    }
    
    // 開始抽獎
    isSpinning = true;
    const spinButton = document.getElementById('spinButton');
    spinButton.disabled = true;
    
    // 禁用獎項選擇，防止抽獎過程中修改
    document.getElementById('currentPrize').disabled = true;
    
    // 播放轉盤音效
    playSpinSound();
    
    // 執行權重抽獎
    const pool = buildWeightedPool();
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winnerName = pool[winnerIndex];
    
    // 計算轉盤需要轉到的角度
    // 讓指針指向獲獎者的扇形（指針在右側 0 度位置）
    const sliceAngle = 360 / pool.length;
    
    // 計算目標扇形的停止角度，讓該扇形中心對準指針
    const stopAngle = 360 - (winnerIndex * sliceAngle + sliceAngle / 2);
    
    // 確保順時針旋轉：計算從當前角度到目標角度需要轉多少
    // 至少轉 5-7 圈
    const minSpins = 5;
    const extraSpins = Math.floor(Math.random() * 3); // 0-2 額外圈數
    const totalSpins = minSpins + extraSpins;
    
    // 計算當前角度在 0-360 範圍內的位置
    const currentAngleMod = ((currentRotation % 360) + 360) % 360;
    
    // 計算需要額外轉的角度才能到達 stopAngle
    let extraAngle = stopAngle - currentAngleMod;
    if (extraAngle <= 0) {
        extraAngle += 360; // 確保是正向旋轉
    }
    
    // 最終目標角度 = 當前角度 + 完整圈數 + 額外角度
    const targetAngle = currentRotation + (totalSpins * 360) + extraAngle;

    // 執行動畫
    animateWheel(targetAngle, winnerName);
}

/**
 * 轉盤動畫
 */
function animateWheel(targetAngle, winnerName) {
    const duration = 4000; // 4 秒
    const startAngle = currentRotation;
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用 easeOutCubic 緩動函數
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentAngle = startAngle + (targetAngle - startAngle) * easeProgress;
        currentRotation = currentAngle;
        
        // 旋轉 canvas
        // currentRotation = targetAngle % 360;
        canvas.style.transform = `rotate(${currentAngle}deg)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            
            // 小延遲再顯示彈窗
            setTimeout(() => {
                onSpinComplete(winnerName);
            }, 3500);
        }
    }
    
    requestAnimationFrame(animate);
}

/**
 * 抽獎完成處理
 */
function onSpinComplete(winnerName) {
    isSpinning = false;
    pendingWinner = winnerName;
    
    // 播放中獎音效
    playWinSound();
    
    // 顯示中獎彈窗
    showWinnerModal(winnerName);
}

/**
 * 顯示中獎彈窗
 */
function showWinnerModal(winnerName) {
    const modal = document.getElementById('winnerModal');
    const modalPrize = document.getElementById('modalPrize');
    const modalWinner = document.getElementById('modalWinner');
    
    modalPrize.textContent = getPrizeWithEnglish(state.currentPrize);
    modalWinner.textContent = winnerName;
    
    modal.classList.add('show');
}

/**
 * 確認領獎
 */
function confirmWinner() {
    if (!pendingWinner) return;
    
    // 找到中獎者並扣除一張券
    const winner = state.participants.find(p => p.name === pendingWinner);
    if (winner && winner.tickets > 0) {
        winner.tickets -= 1;
    }
    
    // 新增到中獎紀錄
    state.winners.push({
        prize: state.currentPrize,
        name: pendingWinner
    });
    
    // 儲存狀態
    saveState();
    
    // 關閉彈窗
    closeModal();
    
    // 重新渲染
    renderAll();
    
    // 重新啟用按鈕和獎項選擇
    document.getElementById('spinButton').disabled = false;
    document.getElementById('currentPrize').disabled = false;
    
    // 顯示提示
    showToast(`恭喜 Congrats! ${pendingWinner} 獲得 won ${state.currentPrize}！`, 'success');
    
    pendingWinner = null;
}

/**
 * 重新抽獎（放棄獎項）
 */
function redrawPrize() {
    // 關閉彈窗
    closeModal();
    
    // 重新啟用按鈕和獎項選擇
    document.getElementById('spinButton').disabled = false;
    document.getElementById('currentPrize').disabled = false;
    
    // 顯示提示
    showToast('獎項已放棄 Prize forfeited', 'error');
    
    pendingWinner = null;
}

/**
 * 關閉彈窗
 */
function closeModal() {
    const modal = document.getElementById('winnerModal');
    modal.classList.remove('show');
}

// ========================================
// 搜尋功能
// ========================================

/**
 * 過濾參與者列表
 */
function filterParticipants() {
    const searchInput = document.getElementById('participantSearch');
    const searchTerm = searchInput.value;
    renderParticipants(searchTerm);
}

/**
 * 清除搜尋
 */
function clearSearch() {
    const searchInput = document.getElementById('participantSearch');
    searchInput.value = '';
    renderParticipants();
    searchInput.focus();
}

// ========================================
// 票券管理
// ========================================

/**
 * 調整參與者的票券數量
 */
function adjustTickets(participantId, delta) {
    // 抽獎進行中不允許調整
    if (isSpinning) {
        showToast('抽獎進行中 Please wait...', 'error');
        return;
    }

    const participant = state.participants.find(p => p.id === participantId);
    if (!participant) {
        console.error('找不到參與者:', participantId);
        return;
    }
    
    const newTickets = participant.tickets + delta;
    
    // 確保不小於 0
    if (newTickets < 0) {
        showToast('抽獎券數量不能小於 0 Cannot be negative', 'error');
        return;
    }
    
    participant.tickets = newTickets;
    
    // 儲存並重新渲染（保持搜尋狀態）
    saveState();
    const searchInput = document.getElementById('participantSearch');
    const searchTerm = searchInput ? searchInput.value : '';
    renderParticipants(searchTerm);
    drawWheel();
}

// ========================================
// Panel 展開/收合
// ========================================

/**
 * 切換 Panel 展開/收合狀態
 */
function togglePanel(panelName) {
    const content = document.getElementById(`${panelName}-content`);
    const toggle = document.getElementById(`${panelName}-toggle`);
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
    }
}

// ========================================
// 中獎紀錄管理
// ========================================

/**
 * 清除所有中獎紀錄
 */
function clearWinners() {
    if (state.winners.length === 0) {
        showToast('目前沒有中獎紀錄 No records', 'error');
        return;
    }
    
    if (confirm('確定要清除所有中獎紀錄嗎？\nClear all winner records?')) {
        state.winners = [];
        saveState();
        renderWinners();
        showToast('中獎紀錄已清除 Records cleared', 'success');
    }
}

/**
 * 重置參與者（清除 localStorage 並重新讀取 CSV）
 */
async function resetParticipants() {
    if (confirm('確定要重置所有參與者嗎？\nReset all participants?\n\n這將清除所有票券變更，恢復預設每人 1 張。\nThis will reset all tickets to default (1).\n\n（中獎紀錄會保留 Winner records will be kept）')) {
        try {
            const response = await fetch('data/name.csv');
            const text = await response.text();
            const lines = text.split('\n');
            const participants = [];
            
            for (let i = 1; i < lines.length; i++) {
                const name = lines[i].trim();
                if (name) {
                    participants.push({
                        id: i,
                        name: name,
                        tickets: 1
                    });
                }
            }
            
            state.participants = participants;
            saveState();
            renderAll();
            showToast('參與者已重置 Participants reset', 'success');
        } catch (error) {
            console.error('重置失敗:', error);
            showToast('重置失敗 Reset failed', 'error');
        }
    }
}

/**
 * 刪除單一中獎紀錄
 */
function removeWinner(index) {
    if (index < 0 || index >= state.winners.length) {
        showToast('找不到該中獎紀錄 Record not found', 'error');
        return;
    }
    
    const winner = state.winners[index];
    if (confirm(`確定要刪除此紀錄嗎？ Delete this record?\n${winner.name} - ${winner.prize}`)) {
        state.winners.splice(index, 1);
        saveState();
        renderWinners();
        showToast(`已刪除 Deleted: ${winner.name}`, 'success');
    }
}

// ========================================
// 工具函數
// ========================================

/**
 * HTML 跳脫，防止 XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 截斷名字（用於轉盤顯示）
 */
function truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
}

/**
 * 顯示 Toast 提示訊息
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    
    if (type === 'error') {
        toast.classList.add('error');
    } else if (type === 'success') {
        toast.classList.add('success');
    }
    
    // 顯示
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3 秒後隱藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// 除錯用函數（可在瀏覽器 Console 中使用）
// ========================================

/**
 * 重設所有資料
 */
function resetAllData() {
    if (confirm('確定要重設所有資料嗎？ Reset all data?\n這將清除所有抽獎紀錄和票券變更。\nThis will clear all records and ticket changes.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

/**
 * 匯出目前狀態
 */
function exportState() {
    const data = JSON.stringify(state, null, 2);
    console.log('目前狀態:');
    console.log(data);
    return data;
}

/**
 * 新增參與者（透過 Console）
 * 用法: addParticipant('新名字', 2)
 */
function addParticipant(name, tickets = 1) {
    const maxId = Math.max(...state.participants.map(p => p.id), 0);
    state.participants.push({
        id: maxId + 1,
        name: name,
        tickets: tickets
    });
    saveState();
    renderAll();
    showToast(`已新增 Added: ${name}`, 'success');
}

/**
 * 移除參與者（透過 Console）
 * 用法: removeParticipant(1)
 */
function removeParticipant(id) {
    const index = state.participants.findIndex(p => p.id === id);
    if (index === -1) {
        console.error('找不到參與者 ID:', id);
        return;
    }
    const name = state.participants[index].name;
    state.participants.splice(index, 1);
    saveState();
    renderAll();
    showToast(`已移除 Removed: ${name}`, 'success');
}

// 在全域暴露除錯函數
window.resetAllData = resetAllData;
window.exportState = exportState;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.removeWinner = removeWinner;
