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

// 預設參與者資料
const DEFAULT_PARTICIPANTS = [
    { id: 1, name: "Amy", tickets: 3 },
    { id: 2, name: "John", tickets: 2 },
    { id: 3, name: "Emily", tickets: 1 },
    { id: 4, name: "David", tickets: 2 },
    { id: 5, name: "Sarah", tickets: 1 },
    { id: 6, name: "Michael", tickets: 3 },
    { id: 7, name: "Lisa", tickets: 2 },
    { id: 8, name: "Kevin", tickets: 1 },
    { id: 9, name: "Jessica", tickets: 2 },
    { id: 10, name: "Chris", tickets: 1 }
];

// 應用程式狀態
let state = {
    participants: [],
    winners: [],
    currentPrize: '特獎'
};

// 轉盤狀態
let isSpinning = false;
let currentRotation = 0;
let pendingWinner = null;

// Canvas 相關
let canvas, ctx;

// ========================================
// 初始化
// ========================================

/**
 * 頁面載入時初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    loadState();
    renderAll();
    setupEventListeners();
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
    // 獎項輸入框變更事件
    const prizeInput = document.getElementById('currentPrize');
    prizeInput.value = state.currentPrize;
    prizeInput.addEventListener('input', function(e) {
        state.currentPrize = e.target.value || '獎項';
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
            state.participants = parsed.participants || DEFAULT_PARTICIPANTS;
            state.winners = parsed.winners || [];
            state.currentPrize = parsed.currentPrize || '特獎';
            console.log('狀態已從 localStorage 載入');
        } else {
            // 使用預設資料
            state.participants = JSON.parse(JSON.stringify(DEFAULT_PARTICIPANTS));
            state.winners = [];
            state.currentPrize = '特獎';
            console.log('使用預設資料');
            saveState();
        }
    } catch (error) {
        console.error('載入狀態時發生錯誤:', error);
        state.participants = JSON.parse(JSON.stringify(DEFAULT_PARTICIPANTS));
        state.winners = [];
        state.currentPrize = '特獎';
        showToast('載入資料時發生錯誤，已使用預設資料', 'error');
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
        showToast('儲存資料時發生錯誤', 'error');
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
function renderParticipants() {
    const container = document.getElementById('participantsList');
    
    if (state.participants.length === 0) {
        container.innerHTML = '<div class="no-winners">目前沒有參與者</div>';
        return;
    }

    let html = '';
    state.participants.forEach(p => {
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
        container.innerHTML = '<div class="no-winners">尚無中獎紀錄</div>';
        return;
    }

    let html = '';
    // 反向顯示，最新的在上面
    [...state.winners].reverse().forEach((w, index) => {
        html += `
            <div class="winner-item">
                <span class="winner-prize">${escapeHtml(w.prize)}</span>
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
    
    // 繪製中心圓
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 中心文字
    ctx.fillStyle = '#C62828';
    ctx.font = 'bold 16px Microsoft JhengHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('抽獎', centerX, centerY);
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
    ctx.font = 'bold 18px Microsoft JhengHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('無可抽獎人員', centerX, centerY);
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
        showToast('抽獎進行中，請稍候...', 'error');
        return;
    }
    
    // 檢查獎項名稱
    const prizeInput = document.getElementById('currentPrize');
    if (!prizeInput.value.trim()) {
        showToast('請先輸入獎項名稱！', 'error');
        prizeInput.focus();
        return;
    }
    
    // 檢查是否有可抽獎的人
    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
        showToast('所有參與者的抽獎券都已用完！', 'error');
        return;
    }
    
    // 開始抽獎
    isSpinning = true;
    const spinButton = document.getElementById('spinButton');
    spinButton.disabled = true;
    
    // 執行權重抽獎
    const pool = buildWeightedPool();
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winnerName = pool[winnerIndex];
    
    // 計算轉盤需要轉到的角度
    // 讓指針指向獲獎者的扇形
    const sliceAngle = 360 / pool.length;
    const targetSlice = winnerIndex;
    
    // 旋轉多圈後停在目標位置（指針在右側，所以要調整角度）
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 圈
    const targetAngle = spins * 360 + (360 - targetSlice * sliceAngle - sliceAngle / 2);
    
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
        canvas.style.transform = `rotate(${currentAngle}deg)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 動畫結束
            onSpinComplete(winnerName);
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
    
    modalPrize.textContent = state.currentPrize;
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
    
    // 重新啟用按鈕
    document.getElementById('spinButton').disabled = false;
    
    // 顯示提示
    showToast(`恭喜 ${pendingWinner} 獲得 ${state.currentPrize}！`, 'success');
    
    pendingWinner = null;
}

/**
 * 重新抽獎（放棄獎項）
 */
function redrawPrize() {
    // 關閉彈窗
    closeModal();
    
    // 重新啟用按鈕
    document.getElementById('spinButton').disabled = false;
    
    // 顯示提示
    showToast('獎項已放棄，可重新抽獎', 'error');
    
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
// 票券管理
// ========================================

/**
 * 調整參與者的票券數量
 */
function adjustTickets(participantId, delta) {
    const participant = state.participants.find(p => p.id === participantId);
    if (!participant) {
        console.error('找不到參與者:', participantId);
        return;
    }
    
    const newTickets = participant.tickets + delta;
    
    // 確保不小於 0
    if (newTickets < 0) {
        showToast('抽獎券數量不能小於 0', 'error');
        return;
    }
    
    participant.tickets = newTickets;
    
    // 儲存並重新渲染
    saveState();
    renderParticipants();
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
        showToast('目前沒有中獎紀錄', 'error');
        return;
    }
    
    if (confirm('確定要清除所有中獎紀錄嗎？')) {
        state.winners = [];
        saveState();
        renderWinners();
        showToast('中獎紀錄已清除', 'success');
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
    if (confirm('確定要重設所有資料嗎？這將清除所有抽獎紀錄和票券變更。')) {
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
    showToast(`已新增參與者: ${name}`, 'success');
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
    showToast(`已移除參與者: ${name}`, 'success');
}

// 在全域暴露除錯函數
window.resetAllData = resetAllData;
window.exportState = exportState;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
