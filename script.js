// 게임 상태
let gameState = {
    gold: 20,
    inventory: Array(25).fill(null), // 5x5 = 25칸
    swordPrice: 20,
    draggedIndex: null
};

// 레벨별 초당 골드
function getBaseGoldPerSecond(level) {
    return 0.1 * Math.pow(2, level - 1);
}

// 강화 단계별 추가 골드 (강화당 +20%)
function getEnhancementBonus(enhancement) {
    return Math.pow(1.2, enhancement);
}

// 검의 총 초당 골드
function getSwordGoldPerSecond(sword) {
    const base = getBaseGoldPerSecond(sword.level);
    const bonus = getEnhancementBonus(sword.enhancement);
    return base * bonus;
}

// 초기 검 1개 추가
gameState.inventory[0] = {level: 1, enhancement: 0};

// DOM 요소
const goldDisplay = document.getElementById('gold');
const inventoryEl = document.getElementById('inventory');
const swordPriceDisplay = document.getElementById('swordPrice');
const buySwordBtn = document.getElementById('buySwordBtn');
const enhanceBtn = document.getElementById('enhanceBtn');
const sortBtn = document.getElementById('sortBtn');
const enhanceModal = document.getElementById('enhanceModal');
const enhanceModalInfo = document.getElementById('enhanceModalInfo');
const confirmEnhanceBtn = document.getElementById('confirmEnhance');
const cancelEnhanceBtn = document.getElementById('cancelEnhance');

let selectedSlotForEnhance = null;

// 화면 업데이트
function updateDisplay() {
    goldDisplay.textContent = gameState.gold.toFixed(1);
    swordPriceDisplay.textContent = gameState.swordPrice;
    
    // 인벤토리 렌더링
    inventoryEl.innerHTML = '';
    gameState.inventory.forEach((sword, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = index;
        
        if (sword) {
            slot.classList.add('has-sword');
            const gps = getSwordGoldPerSecond(sword);
            const enhanceText = sword.enhancement > 0 ? `+${sword.enhancement}` : '';
            
            slot.innerHTML = `
                <div class="sword-icon-inv">⚔️</div>
                <div class="sword-level-inv">Lv.${sword.level}</div>
                ${enhanceText ? `<div class="sword-enhance-inv">${enhanceText}</div>` : ''}
                <div class="sword-gold-inv">${gps.toFixed(2)}G/s</div>
            `;
            
            slot.draggable = true;
            slot.addEventListener('dragstart', handleDragStart);
            slot.addEventListener('dragend', handleDragEnd);
        }
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('click', () => handleSlotClick(index));
        
        inventoryEl.appendChild(slot);
    });
}

// 드래그 시작
function handleDragStart(e) {
    const index = parseInt(e.target.dataset.index);
    gameState.draggedIndex = index;
    e.target.classList.add('dragging');
}

// 드래그 종료
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

// 드래그 오버
function handleDragOver(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    slot.classList.add('drag-over');
}

// 드롭
function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    const sourceIndex = gameState.draggedIndex;
    
    if (sourceIndex === null || sourceIndex === targetIndex) return;
    
    const sourceSword = gameState.inventory[sourceIndex];
    const targetSword = gameState.inventory[targetIndex];
    
    // 같은 레벨의 검끼리 합성
    if (sourceSword && targetSword && 
        sourceSword.level === targetSword.level && 
        sourceSword.enhancement === targetSword.enhancement) {
        
        // 합성
        gameState.inventory[sourceIndex] = null;
        gameState.inventory[targetIndex] = {
            level: sourceSword.level + 1,
            enhancement: 0
        };
        
        showFloatingText(`🗡️ Lv.${sourceSword.level + 1} 검 획득!`);
    } else {
        // 위치 교환
        gameState.inventory[sourceIndex] = targetSword;
        gameState.inventory[targetIndex] = sourceSword;
    }
    
    gameState.draggedIndex = null;
    updateDisplay();
}

// 슬롯 클릭 (강화용)
function handleSlotClick(index) {
    if (!gameState.inventory[index]) return;
    selectedSlotForEnhance = index;
}

// 검 구매
function buySword() {
    if (gameState.gold >= gameState.swordPrice) {
        // 빈 슬롯 찾기
        const emptyIndex = gameState.inventory.findIndex(slot => slot === null);
        
        if (emptyIndex === -1) {
            showFloatingText('❌ 인벤토리가 가득 찼습니다!');
            return;
        }
        
        gameState.gold -= gameState.swordPrice;
        gameState.inventory[emptyIndex] = {level: 1, enhancement: 0};
        updateDisplay();
        showFloatingText('⚔️ Lv.1 검 획득!');
    }
}

// 검 강화 모달 열기
function openEnhanceModal() {
    if (selectedSlotForEnhance === null || !gameState.inventory[selectedSlotForEnhance]) {
        showFloatingText('❌ 강화할 검을 선택하세요!');
        return;
    }
    
    const sword = gameState.inventory[selectedSlotForEnhance];
    const cost = getEnhanceCost(sword);
    const successRate = getSuccessRate(sword.enhancement);
    
    enhanceModalInfo.innerHTML = `
        <div style="font-size: 3em; margin-bottom: 10px;">⚔️</div>
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 15px;">
            Lv.${sword.level} ${sword.enhancement > 0 ? `+${sword.enhancement}` : ''}
        </div>
        <div style="margin-bottom: 10px;">
            <strong>비용:</strong> ${cost}G
        </div>
        <div style="margin-bottom: 5px;">
            ✅ 성공: ${successRate}% (강화 +1)
        </div>
        <div style="margin-bottom: 5px;">
            😐 유지: ${100 - successRate - 10}%
        </div>
        <div style="color: #f5576c;">
            💥 파괴: 10%
        </div>
    `;
    
    if (gameState.gold < cost) {
        confirmEnhanceBtn.disabled = true;
        confirmEnhanceBtn.textContent = '골드 부족';
    } else {
        confirmEnhanceBtn.disabled = false;
        confirmEnhanceBtn.textContent = '강화하기';
    }
    
    enhanceModal.classList.add('show');
}

// 검 강화 실행
function enhanceSword() {
    if (selectedSlotForEnhance === null) return;
    
    const sword = gameState.inventory[selectedSlotForEnhance];
    const cost = getEnhanceCost(sword);
    
    if (gameState.gold < cost) return;
    
    gameState.gold -= cost;
    
    const successRate = getSuccessRate(sword.enhancement);
    const random = Math.random() * 100;
    
    if (random < successRate) {
        // 성공
        sword.enhancement++;
        showFloatingText(`✨ 강화 성공! +${sword.enhancement}`);
    } else if (random < 100 - 10) {
        // 유지
        showFloatingText('😐 강화 유지');
    } else {
        // 파괴
        gameState.inventory[selectedSlotForEnhance] = null;
        showFloatingText('💥 검 파괴!');
    }
    
    enhanceModal.classList.remove('show');
    selectedSlotForEnhance = null;
    updateDisplay();
}

// 정렬
function sortInventory() {
    const swords = gameState.inventory.filter(s => s !== null);
    
    // 레벨 내림차순, 강화 내림차순 정렬
    swords.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return b.enhancement - a.enhancement;
    });
    
    gameState.inventory = Array(25).fill(null);
    swords.forEach((sword, index) => {
        gameState.inventory[index] = sword;
    });
    
    updateDisplay();
    showFloatingText('📊 정렬 완료!');
}

function getEnhanceCost(sword) {
    return Math.floor(50 * Math.pow(2, sword.enhancement));
}

function getSuccessRate(enhancement) {
    return Math.max(30, 70 - enhancement * 10);
}

// 플로팅 텍스트 효과
function showFloatingText(text) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'fixed';
    floatingText.style.left = '50%';
    floatingText.style.top = '40%';
    floatingText.style.transform = 'translate(-50%, -50%)';
    floatingText.style.color = '#f5576c';
    floatingText.style.fontSize = '2em';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.zIndex = '1000';
    floatingText.style.animation = 'floatUp 1s ease-out';
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => {
        floatingText.remove();
    }, 1000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%);
        }
    }
`;
document.head.appendChild(style);

// 이벤트 리스너
buySwordBtn.addEventListener('click', buySword);
enhanceBtn.addEventListener('click', openEnhanceModal);
sortBtn.addEventListener('click', sortInventory);
confirmEnhanceBtn.addEventListener('click', enhanceSword);
cancelEnhanceBtn.addEventListener('click', () => {
    enhanceModal.classList.remove('show');
    selectedSlotForEnhance = null;
});

// 모달 배경 클릭시 닫기
enhanceModal.addEventListener('click', (e) => {
    if (e.target === enhanceModal) {
        enhanceModal.classList.remove('show');
        selectedSlotForEnhance = null;
    }
});

// 자동 골드 획득 (0.1초마다)
setInterval(() => {
    let totalGold = 0;
    gameState.inventory.forEach(sword => {
        if (sword) {
            totalGold += getSwordGoldPerSecond(sword) / 10;
        }
    });
    
    if (totalGold > 0) {
        gameState.gold += totalGold;
        updateDisplay();
    }
}, 100);

// 초기 화면 업데이트
updateDisplay();
